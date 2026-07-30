<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EmployeeDocument;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollRunCreationTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $branch;
    protected $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        
        $this->client = Client::factory()->create([
            'status' => 'active',
            'pt_state' => 'Maharashtra',
            'gstin' => '27AABCT1234L1ZQ',
        ]);
        
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Mumbai Office',
            'state' => 'Maharashtra',
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'John Creation',
            'personal_email' => 'john@example.com',
            'phone_number' => '9988776651',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => '1111111111',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'John Creation',
            'pan_number' => 'ABCDE1111A',
            'employee_code' => 'TEC-900',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0, 'da' => 0, 'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'tds_regime' => 'new', 'gratuity_mode' => 'part_of_ctc', 'lop_basis_days' => '30', 'declarations_accepted' => 1,
            'pf_applicable' => true, 'esi_applicable' => false, 'pt_applicable' => true, 'lwf_applicable' => false,
        ]);

        // Bypass document gate
        foreach ($this->employee->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $this->employee->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        // Seed some attendance records (all present)
        $start = Carbon::parse('2026-06-01');
        $end = Carbon::parse('2026-06-30');
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Test successful draft run creation.
     */
    public function test_successful_payroll_run_creation()
    {
        $response = $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertStatus(302); // Redirect back

        $run = PayrollRun::first();
        $this->assertNotNull($run);
        $this->assertEquals($this->client->id, $run->client_id);
        $this->assertEquals('2026-06-01', $run->payroll_month);
        $this->assertEquals('draft', $run->status);

        $items = DB::table('payroll_run_items')->where('payroll_run_id', $run->id)->get();
        $this->assertCount(1, $items);
        $this->assertEquals($this->employee->id, $items->first()->employee_id);
    }

    /**
     * Test draft run overwrite in-place (preserves run ID, resets items).
     */
    public function test_draft_run_overwrite_in_place()
    {
        // 1. Trigger first run
        $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
        ]);

        $run1 = PayrollRun::first();
        $this->assertNotNull($run1);
        $runId = $run1->id;

        // 2. Trigger second run (recalculate)
        $response = $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertStatus(302);

        $run2 = PayrollRun::first();
        $this->assertEquals($runId, $run2->id, 'The parent draft PayrollRun ID must be preserved.');

        $items = DB::table('payroll_run_items')->where('payroll_run_id', $runId)->get();
        $this->assertCount(1, $items);
    }

    /**
     * Test locked run creation rejection.
     */
    public function test_locked_run_creation_rejection()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);

        $response = $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
        ]);

        $response->assertSessionHas('error', 'This payroll run is already locked and invoiced.');
    }

    /**
     * Test approved run creation rejection (ensures approved items are untouched).
     */
    public function test_approved_run_creation_rejection()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'approved',
        ]);

        // Insert an approved run item that should be protected
        $itemId = DB::table('payroll_run_items')->insertGetId([
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30, 'lop_days' => 0, 
            'basic_pay' => 15000, 'hra' => 5000,
            'conveyance' => 0, 'da' => 0, 'medical_allowance' => 0,
            'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 20000, 'employee_pf' => 1800, 'employee_esi' => 0,
            'professional_tax' => 200, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 18000,
            'employer_pf' => 1950, 'employer_esi' => 0, 'employer_lwf' => 0,
            'is_excluded' => false, 'attendance_source' => 'live_punch',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
        ]);

        $response->assertSessionHas('error', 'This payroll run is already approved. You must revert it to draft first.');

        // Assert DB was NOT mutated
        $this->assertEquals('approved', $run->fresh()->status);
        $this->assertTrue(DB::table('payroll_run_items')->where('id', $itemId)->exists());
    }
}
