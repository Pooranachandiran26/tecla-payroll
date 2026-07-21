<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ComplianceDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $clientA;
    protected $clientB;
    protected $employeeA;
    protected $employeeB;
    protected $employeeC;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin']);
        
        // Setup clients and employees
        $this->clientA = Client::factory()->create(['company_name' => 'Hyundai']);
        $this->clientB = Client::factory()->create(['company_name' => 'Tata Motors']);

        $branchA = \App\Models\ClientBranch::create([
            'client_id' => $this->clientA->id,
            'branch_name' => 'Branch A',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z5',
        ]);
        $branchB = \App\Models\ClientBranch::create([
            'client_id' => $this->clientB->id,
            'branch_name' => 'Branch B',
            'state' => 'Karnataka',
            'gstin' => '29ABCDE1234F1Z5',
        ]);

        $this->employeeA = Employee::factory()->create(['client_id' => $this->clientA->id, 'branch_id' => $branchA->id, 'basic_pay' => 10000, 'uan_mode' => 'new', 'personal_email' => 'empa@example.com', 'bank_account_number' => '9999000011', 'pan_number' => 'ABCDE1111A', 'aadhaar_number' => '100020003001']);
        $this->employeeB = Employee::factory()->create(['client_id' => $this->clientA->id, 'branch_id' => $branchA->id, 'basic_pay' => 20000, 'uan_mode' => 'new', 'personal_email' => 'empb@example.com', 'bank_account_number' => '9999000022', 'pan_number' => 'ABCDE1111B', 'aadhaar_number' => '100020003002']);
        $this->employeeC = Employee::factory()->create(['client_id' => $this->clientB->id, 'branch_id' => $branchB->id, 'basic_pay' => 15000, 'uan_mode' => 'new', 'personal_email' => 'empc@example.com', 'bank_account_number' => '9999000033', 'pan_number' => 'ABCDE1111C', 'aadhaar_number' => '100020003003']);
    }

    private function createLockedPayrollRun($client, $employees, $month, $isSupplementary = false, $parentRunId = null)
    {
        $runId = DB::table('payroll_runs')->insertGetId([
            'client_id' => $client->id,
            'payroll_month' => $month,
            'status' => 'locked',
            'is_supplementary_run' => $isSupplementary,
            'parent_run_id' => $parentRunId,
            'locked_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($employees as $employee) {
            DB::table('payroll_run_items')->insert([
                'payroll_run_id' => $runId,
                'employee_id' => $employee->id,
                'is_excluded' => false,
                'paid_days' => 30,
                'lop_days' => 0,
                'basic_pay' => $employee->basic_pay,
                'hra' => 0, 'conveyance' => 0, 'da' => 0, 'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
                'gross_total' => $employee->basic_pay,
                'employee_pf' => 0, 'employee_esi' => 0, 'professional_tax' => 0, 'lwf_deduction' => 0, 'lop_deduction' => 0, 'tds_deduction' => 0, 'loan_emi_deduction' => 0,
                'net_pay' => $employee->basic_pay,
                'employer_pf' => 0, 'employer_esi' => 0,
                'attendance_source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        return $runId;
    }

    public function test_supplementary_headcount_is_deduplicated()
    {
        $period = Carbon::now()->startOfMonth()->format('Y-m-d');
        
        // Hyundai Scenario: 
        // Parent run with Employee A
        $parentRunId = $this->createLockedPayrollRun($this->clientA, [$this->employeeA], $period);
        // Supplementary run with Employee B (and maybe Employee A again, simulating an arrears run)
        $this->createLockedPayrollRun($this->clientA, [$this->employeeA, $this->employeeB], $period, true, $parentRunId);

        // Tata Motors Scenario: 
        // Just one parent run with Employee C
        $this->createLockedPayrollRun($this->clientB, [$this->employeeC], $period);

        $response = $this->actingAs($this->admin)->get('/compliance');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Compliance/ComplianceReports')
            ->has('stats.total_headcount')
            ->where('stats.total_headcount', 3) // 2 for Hyundai, 1 for Tata
            ->has('clients', 2) // 2 clients
        );

        $clients = $response->viewData('page')['props']['clients'];
        
        $hyundaiData = collect($clients)->firstWhere('name', 'Hyundai');
        $tataData = collect($clients)->firstWhere('name', 'Tata Motors');

        $this->assertEquals(2, $hyundaiData['headcount']); // Deduplicated correctly
        $this->assertEquals(1, $tataData['headcount']);
    }

    public function test_update_or_create_prevents_duplicate_filings_and_updates_status()
    {
        $period = Carbon::now()->startOfMonth()->format('Y-m');
        
        // Mark PF as filed
        $response = $this->actingAs($this->admin)->post('/compliance/mark-filed', [
            'client_id' => $this->clientA->id,
            'statute' => 'pf',
            'period' => $period,
            'status' => 'filed'
        ]);

        $response->assertRedirect();
        $this->assertDatabaseCount('compliance_filings', 1);
        $this->assertDatabaseHas('compliance_filings', [
            'client_id' => $this->clientA->id,
            'statute' => 'pf',
            'status' => 'filed'
        ]);

        // Attempt to mark it again as filed (simulate double click)
        $this->actingAs($this->admin)->post('/compliance/mark-filed', [
            'client_id' => $this->clientA->id,
            'statute' => 'pf',
            'period' => $period,
            'status' => 'filed'
        ]);

        // Still only 1 row!
        $this->assertDatabaseCount('compliance_filings', 1);

        // Update it to pending (un-marking it)
        $resp = $this->actingAs($this->admin)->post('/compliance/mark-filed', [
            'client_id' => $this->clientA->id,
            'statute' => 'pf',
            'period' => $period,
            'status' => 'pending'
        ]);

        $this->assertDatabaseCount('compliance_filings', 1); // No duplicates
        $this->assertDatabaseHas('compliance_filings', [
            'client_id' => $this->clientA->id,
            'statute' => 'pf',
            'status' => 'pending'
        ]);
    }

    public function test_pending_default_for_unfiled_clients()
    {
        $response = $this->actingAs($this->admin)->get('/compliance');

        $clients = $response->viewData('page')['props']['clients'];
        $hyundaiData = collect($clients)->firstWhere('name', 'Hyundai');

        // Since we haven't filed anything, all statuses should default to pending
        $this->assertEquals('pending', $hyundaiData['filings']['pf']['status']);
        $this->assertEquals('pending', $hyundaiData['filings']['esi']['status']);
        $this->assertEquals('pending', $hyundaiData['filings']['pt']['status']);
        $this->assertEquals('pending', $hyundaiData['filings']['tds']['status']);
        $this->assertEquals('pending', $hyundaiData['filings']['clra']['status']);

        // Assert pending actions calculation (2 clients * 5 statutes = 10 pending actions)
        $this->assertEquals(10, $response->viewData('page')['props']['stats']['pending_filings']);
    }

    public function test_non_admin_cannot_mark_filed()
    {
        $employeeUser = User::factory()->create(['role' => 'employee']);

        $response = $this->actingAs($employeeUser)->post('/compliance/mark-filed', [
            'client_id' => $this->clientA->id,
            'statute' => 'pf',
            'period' => Carbon::now()->startOfMonth()->format('Y-m'),
            'status' => 'filed'
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseCount('compliance_filings', 0);
    }
}
