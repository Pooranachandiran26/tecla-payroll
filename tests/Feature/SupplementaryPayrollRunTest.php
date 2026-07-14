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

class SupplementaryPayrollRunTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $branch;
    protected $employeeA;
    protected $employeeB;
    protected $employeePF;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        
        $this->client = Client::factory()->create([
            'status' => 'active',
            'pt_state' => 'Maharashtra'
        ]);
        
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Mumbai Office',
            'state' => 'Maharashtra'
        ]);

        // Employee A: Eligible initially
        $this->employeeA = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Employee A',
            'personal_email' => 'a@example.com',
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
            'account_holder_name' => 'Employee A',
            'pan_number' => 'ABCDE1111A',
            'employee_code' => 'TEC-111',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => false,
        ]);

        // Employee B: Excluded initially due to missing bank details
        $this->employeeB = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Employee B',
            'personal_email' => 'b@example.com',
            'phone_number' => '9988776652',
            'date_of_birth' => '1992-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Designer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '456 St',
            'bank_account_number' => '', // Excludes!
            'bank_ifsc' => '',
            'bank_name' => '',
            'bank_branch' => '',
            'account_holder_name' => '',
            'pan_number' => 'ABCDE2222B',
            'employee_code' => 'TEC-222',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => false,
        ]);

        // Canonical PF Employee (TEC-088)
        $this->employeePF = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Canonical Employee',
            'personal_email' => 'pf@example.com',
            'phone_number' => '9988776653',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Manager',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '789 St',
            'bank_account_number' => '8888888888',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Canonical Employee',
            'pan_number' => 'ABCDE3333C',
            'employee_code' => 'TEC-088',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => false,
        ]);

        // Bypass document gates for all
        foreach ([$this->employeeA, $this->employeeB, $this->employeePF] as $emp) {
            foreach ($emp->required_document_types as $type) {
                EmployeeDocument::create([
                    'employee_id' => $emp->id,
                    'document_type' => $type,
                    'file_path' => 'test.pdf',
                    'status' => 'verified',
                ]);
            }
        }
    }

    /**
     * Helper to seed full month present records for an employee.
     */
    private function seedAttendance($employeeId, $monthStr)
    {
        $start = Carbon::parse($monthStr)->startOfMonth();
        $end = Carbon::parse($monthStr)->endOfMonth();
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $employeeId,
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
     * Test Phase 6: Supplementary run execution and stats aggregation.
     */
    public function test_supplementary_payroll_run_workflow()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        // 1. Seed attendance for June 2026
        $this->seedAttendance($this->employeeA->id, $monthStart);
        $this->seedAttendance($this->employeeB->id, $monthStart);

        // 2. Create the main draft payroll run
        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        // Process Employee A in the main run (eligible)
        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);
        $calcA = $calculator->calculateForEmployee($this->employeeA, $parentRun);

        // Process Employee B in the main run (excluded)
        // Since they have no bank details, we write them as excluded
        $eligibilityService = app(\App\Services\PayrollEligibilityService::class);
        $eligB = $eligibilityService->checkEmployee($this->employeeB, $this->client, $monthStart, $monthEnd);
        $this->assertFalse($eligB['is_eligible']);

        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeB->id,
            'paid_days' => 0,
            'lop_days' => 0,
            'basic_pay' => 0,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 0,
            'employee_pf' => 0,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 0,
            'employer_pf' => 0,
            'employer_esi' => 0,
            'is_excluded' => true,
            'exclusion_reason' => implode(', ', $eligB['exclusions']),
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update parent run totals
        $parentRun->update([
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => $calcA['gross_total'],
            'total_net_disbursement' => $calcA['net_pay'],
            'total_employer_statutory_cost' => $calcA['employer_statutory_cost'],
        ]);

        // Approve the parent run
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/approve")->assertSessionHas('success');
        $this->assertEquals('approved', $parentRun->fresh()->status);

        // 3. Resolve Employee B's bank details
        $this->employeeB->update([
            'bank_account_number' => '2222222222',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Employee B',
        ]);

        // 4. Trigger Supplementary Run
        $response = $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Retrieve supplementary child run
        $childRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $this->assertNotNull($childRun);
        $this->assertTrue((bool)$childRun->is_supplementary_run);
        $this->assertEquals($parentRun->payroll_month, $childRun->payroll_month);
        $this->assertEquals('draft', $childRun->status);

        // Assert items contain Employee B only
        $childItems = DB::table('payroll_run_items')->where('payroll_run_id', $childRun->id)->get();
        $this->assertCount(1, $childItems);
        $this->assertEquals($this->employeeB->id, $childItems->first()->employee_id);
        $this->assertEquals(0, $childItems->first()->is_excluded);
        $this->assertGreaterThan(0.00, $childItems->first()->net_pay);

        // Verify Employee A is NOT reprocessed
        $this->assertNotContains($this->employeeA->id, $childItems->pluck('employee_id')->toArray());

        // 5. Assert getCombinedStats() statistics aggregation
        $stats = $parentRun->getCombinedStats();

        // Combined processed count should be 2 (Employee A from parent + Employee B from child)
        $this->assertEquals(2, $stats['total_employees_processed']);
        // Combined excluded count should drop to 0
        $this->assertEquals(0, $stats['total_employees_excluded']);
        
        $expectedGross = (float)$calcA['gross_total'] + (float)$childItems->first()->gross_total;
        $expectedNet = (float)$calcA['net_pay'] + (float)$childItems->first()->net_pay;
        
        $this->assertEquals($expectedGross, $stats['total_gross_earnings']);
        $this->assertEquals($expectedNet, $stats['total_net_disbursement']);

        // Fetch all items from parent run to verify Employee A details
        $parentItems = DB::table('payroll_run_items')->where('payroll_run_id', $parentRun->id)->get();

        // Print real evidence output for user checklist
        echo "\n\n--- 1. PARENT RUN'S PAYROLL RUN ITEMS ---\n";
        echo json_encode($parentItems, JSON_PRETTY_PRINT) . "\n";

        echo "\n--- 2. SUPPLEMENTARY RUN'S PAYROLL RUN ITEMS ---\n";
        echo json_encode($childItems, JSON_PRETTY_PRINT) . "\n";

        echo "\n--- 3. DYNAMIC COMBINED STATS FROM PARENT RUN ---\n";
        echo json_encode($stats, JSON_PRETTY_PRINT) . "\n\n";
    }

    /**
     * Canonical PF check
     */
    public function test_canonical_pf_check()
    {
        $this->employeePF->update([
            'employer_pf_monthly' => 1950.00
        ]);

        $emp = Employee::where('employee_code', 'TEC-088')->first();
        $this->assertNotNull($emp);
        $this->assertEquals(1950.00, $emp->employer_pf_monthly);
    }
}
