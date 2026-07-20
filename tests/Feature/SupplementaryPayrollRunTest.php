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
use Inertia\Testing\AssertableInertia as Assert;

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
        // Deactivate employeePF for this test so they aren't processed as a new hire
        $this->employeePF->update(['status' => 'onboarding']);

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
        $emp = Employee::where('employee_code', 'TEC-088')->first();
        $this->assertNotNull($emp);
        
        $expectedPf = min($emp->basic_pay, 15000) * 0.13;
        $this->assertEquals(1950.00, $expectedPf);
        $this->assertEquals($expectedPf, $emp->employer_pf_monthly);
    }

    public function test_supplementary_captures_new_hires_after_lock()
    {
        // Deactivate employeePF and employeeB so they aren't processed as new hires in this test
        $this->employeePF->update(['status' => 'onboarding']);
        $this->employeeB->update(['status' => 'onboarding']);

        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        // 1. Seed attendance for Employee A
        $this->seedAttendance($this->employeeA->id, $monthStart);

        // 2. Create the main parent run
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

        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);
        $calcA = $calculator->calculateForEmployee($this->employeeA, $parentRun);

        $parentRun->update([
            'total_employees_processed' => 1,
            'total_gross_earnings' => $calcA['gross_total'],
            'total_net_disbursement' => $calcA['net_pay'],
            'total_employer_statutory_cost' => $calcA['employer_statutory_cost'],
        ]);

        $parentRun->update([
            'status' => 'locked',
            'locked_at' => now(),
        ]);

        // 3. Create a new employee (Employee C) with DOJ = 2026-06-15 (mid-month)
        $employeeC = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Employee C',
            'personal_email' => 'c@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1993-01-01',
            'date_of_joining' => '2026-06-15', // mid-month DOJ
            'designation' => 'QA',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '321 St',
            'bank_account_number' => '3333333333',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Employee C',
            'pan_number' => 'ABCDE3333D',
            'employee_code' => 'TEC-333',
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

        // Bypass document gates for Employee C
        foreach ($employeeC->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employeeC->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        // Seed attendance for Employee C starting from DOJ
        $start = Carbon::parse('2026-06-15');
        $end = Carbon::parse($monthEnd);
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $employeeC->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 4. Trigger Supplementary Run
        $response = $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify Child Run
        $childRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $this->assertNotNull($childRun);

        $childItems = DB::table('payroll_run_items')->where('payroll_run_id', $childRun->id)->get();
        $this->assertCount(1, $childItems);
        $this->assertEquals($employeeC->id, $childItems->first()->employee_id);
        $this->assertEquals(0, $childItems->first()->is_excluded);
        
        // Confirm pro-rated pay (they joined mid-month on June 15, so basic/gross should be pro-rated)
        $this->assertLessThan(20000.00, (float)$childItems->first()->gross_total);
        $this->assertGreaterThan(0.00, (float)$childItems->first()->gross_total);
    }

    public function test_supplementary_avoids_duplicate_of_already_processed_employees()
    {
        // Deactivate employeePF and employeeB so they aren't processed as new hires in this test
        $this->employeePF->update(['status' => 'onboarding']);
        $this->employeeB->update(['status' => 'onboarding']);

        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        $this->seedAttendance($this->employeeA->id, $monthStart);

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'locked_at' => now(),
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($this->employeeA, $parentRun);

        // We create a new employee who needs processing so we can trigger supplementary
        $employeeC = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Employee C',
            'personal_email' => 'c@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1993-01-01',
            'date_of_joining' => '2026-06-15',
            'designation' => 'QA',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '321 St',
            'bank_account_number' => '3333333333',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Employee C',
            'pan_number' => 'ABCDE3333D',
            'employee_code' => 'TEC-333',
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

        foreach ($employeeC->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employeeC->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        $this->seedAttendance($employeeC->id, $monthStart);

        // Run supplementary
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");

        $childRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $childItems = DB::table('payroll_run_items')->where('payroll_run_id', $childRun->id)->get();

        // Confirm employee A is NOT in the child run
        $this->assertNotContains($this->employeeA->id, $childItems->pluck('employee_id')->toArray());
    }

    public function test_supplementary_invoice_merge_for_new_hires()
    {
        // Deactivate employeePF and employeeB so they aren't processed as new hires in this test
        $this->employeePF->update(['status' => 'onboarding']);
        $this->employeeB->update(['status' => 'onboarding']);

        // Seed agency GSTIN
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_gstin'],
            ['value' => '27AABCM1234N1ZQ', 'type' => 'string']
        );

        // Update client to have all billing and GST information populated
        $this->client->update([
            'billing_model' => 'markup',
            'markup_percentage' => 10.0,
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        $this->seedAttendance($this->employeeA->id, $monthStart);

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'approved',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($this->employeeA, $parentRun);

        // Lock parent run so it generates an invoice
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/lock");
        $this->assertEquals('locked', $parentRun->fresh()->status);

        // Verify parent invoice exists
        $invoice = \App\Models\Invoice::where('payroll_run_id', $parentRun->id)->first();
        $this->assertNotNull($invoice);
        $initialGrandTotal = (float)$invoice->grand_total;

        // Create new employee C
        $employeeC = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Employee C',
            'personal_email' => 'c@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1993-01-01',
            'date_of_joining' => '2026-06-15',
            'designation' => 'QA',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '321 St',
            'bank_account_number' => '3333333333',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Employee C',
            'pan_number' => 'ABCDE3333D',
            'employee_code' => 'TEC-333',
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

        foreach ($employeeC->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employeeC->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        $this->seedAttendance($employeeC->id, $monthStart);

        // Run supplementary
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");

        $childRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $this->assertNotNull($childRun);

        // Lock child run (should trigger invoice generation / merge)
        // Set child run status to approved first to allow locking
        $childRun->update(['status' => 'approved']);
        $this->actingAs($this->admin)->post("/payroll/{$childRun->id}/lock");

        // Verify child run is locked
        $this->assertEquals('locked', $childRun->fresh()->status);

        // Verify NO new invoice is created for child run ID, but parent invoice grand_total increases!
        $this->assertEquals(0, \App\Models\Invoice::where('payroll_run_id', $childRun->id)->count());
        
        $mergedInvoice = $invoice->fresh();
        $this->assertGreaterThan($initialGrandTotal, (float)$mergedInvoice->grand_total);
    }

    public function test_supplementary_flags_old_new_hire_warning()
    {
        // Deactivate employeePF and employeeB so they aren't processed as new hires in this test
        $this->employeePF->update(['status' => 'onboarding']);
        $this->employeeB->update(['status' => 'onboarding']);

        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        $this->seedAttendance($this->employeeA->id, $monthStart);

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'locked_at' => now(),
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($this->employeeA, $parentRun);

        // Create new employee C whose DOJ is more than 60 days before June 2026 (e.g. 2026-02-01)
        $employeeC = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Employee C',
            'personal_email' => 'c@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1993-01-01',
            'date_of_joining' => '2026-02-01', // > 60 days before 2026-06-01
            'designation' => 'QA',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '321 St',
            'bank_account_number' => '3333333333',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Employee C',
            'pan_number' => 'ABCDE3333D',
            'employee_code' => 'TEC-333',
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

        foreach ($employeeC->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employeeC->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        $this->seedAttendance($employeeC->id, $monthStart);

        // Run supplementary
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");

        $childRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $childItem = DB::table('payroll_run_items')
            ->where('payroll_run_id', $childRun->id)
            ->where('employee_id', $employeeC->id)
            ->first();

        $this->assertNotNull($childItem);
        $this->assertStringContainsString("has no row in this month's parent run despite joining on", $childItem->warning_notes);
        $this->assertStringContainsString("investigate why they were missed", $childItem->warning_notes);
    }

    public function test_supplementary_button_visible_on_approval_page_with_new_hire()
    {
        // Deactivate other default employees
        Employee::where('id', '!=', $this->employeeA->id)->update(['status' => 'suspended']);

        $monthStart = '2026-07-01';
        $monthEnd = '2026-07-31';

        // 1. Create a parent payroll run
        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        // Insert parent run item for employeeA
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeA->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 10000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 10000,
            'employee_pf' => 1300,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 9000,
            'employer_pf' => 1300,
            'employer_esi' => 0,
            'is_excluded' => 0,
            'attendance_source' => 'live_punch',
            'salary_revision_applied' => 0,
        ]);

        // 2. Create a new employeeC (new hire) who joined mid-month
        $employeeC = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'New Hire Jane',
            'personal_email' => 'jane@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2026-07-15',
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => '9999999999',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Jane Doe',
            'pan_number' => 'ABCDE4444D',
            'employee_code' => 'TEC-333',
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

        foreach ($employeeC->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employeeC->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        $this->seedAttendance($employeeC->id, $monthStart);

        // 3. Confirm getNewHireCandidates resolves employeeC
        $candidates = $parentRun->getNewHireCandidates();
        $this->assertCount(1, $candidates);
        $this->assertEquals($employeeC->id, $candidates->first()->id);

        // 4. Request the approval page and check props and rendered elements
        $response = $this->actingAs($this->admin)->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart
        ]));

        $response->assertStatus(200);

        // Assert Inertia prop has the candidate
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollApproval')
            ->has('newHires', 1)
            ->where('newHires.0.employee_code', 'TEC-333')
        );



        // 5. Confirm runSupplementary results in identical set
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");
        $childRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $childItems = DB::table('payroll_run_items')->where('payroll_run_id', $childRun->id)->get();
        
        $this->assertCount(1, $childItems);
        $this->assertEquals($employeeC->id, $childItems->first()->employee_id);
    }

    private function makePayrollRunItemData(array $overrides = []): array
    {
        return array_merge([
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 10000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 10000,
            'employee_pf' => 1200,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'deferred_loan_amount' => 0,
            'net_pay' => 8600,
            'employer_pf' => 1300,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'is_excluded' => 0,
            'exclusion_reason' => null,
            'attendance_source' => 'live_punch',
            'salary_revision_applied' => 0,
        ], $overrides);
    }

    public function test_index_approval_shows_combined_totals_and_clears_new_hire_candidate()
    {
        Employee::where('id', '!=', $this->employeeA->id)->update(['status' => 'suspended']);
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeA->id,
        ]));

        $employeeC = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'New Hire Candidate',
            'date_of_joining' => '2026-07-15',
            'status' => 'active',
            'employee_code' => 'TEC-999',
            'basic_pay' => 15000,
            'hra' => 5000,
            'lop_basis_days' => '30',
            'pf_applicable' => true,
        ]);

        foreach ($employeeC->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employeeC->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }
        $this->seedAttendance($employeeC->id, $monthStart);

        // Run supplementary
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");

        // Now GET /payroll/approval
        $response = $this->actingAs($this->admin)->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart
        ]));

        $response->assertStatus(200);

        // Assert combined total employees processed is 2, items prop count is 2, and newHires count is 0
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollApproval')
            ->where('run.total_employees_processed', 2)
            ->has('items', 2)
            ->has('newHires', 0)
        );
    }

    public function test_dedup_shows_latest_exclusion_reason_from_supplementary_run()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 0,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        // Excluded in parent run for Reason A
        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeA->id,
            'paid_days' => 0,
            'gross_total' => 0,
            'net_pay' => 0,
            'is_excluded' => 1,
            'exclusion_reason' => 'Reason A: Missing Bank Details',
        ]));

        // Child supplementary run
        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 0,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        // Excluded in supplementary run for Reason B
        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $childRun->id,
            'employee_id' => $this->employeeA->id,
            'paid_days' => 0,
            'gross_total' => 0,
            'net_pay' => 0,
            'is_excluded' => 1,
            'exclusion_reason' => 'Reason B: Missing PAN Details',
        ]));

        // GET /payroll/approval
        $response = $this->actingAs($this->admin)->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart
        ]));

        $response->assertStatus(200);

        // Assert that the item in items prop shows Reason B (the latest status)
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollApproval')
            ->where('items.0.exclusion_reason', 'Reason B: Missing PAN Details')
        );
    }

    public function test_prevent_duplicate_draft_supplementary_run()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        // Create an existing draft supplementary run
        PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        // Attempt to create a SECOND draft supplementary run
        $response = $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");

        $response->assertSessionHas('error', 'A draft supplementary run already exists for this parent. Please approve or delete it before creating another.');
        $this->assertEquals(1, PayrollRun::where('parent_run_id', $parentRun->id)->count());
    }

    public function test_index_payslips_includes_locked_supplementary_run_items()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeA->id,
            'is_excluded' => 0,
        ]));

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeB->id,
            'is_excluded' => 1,
            'exclusion_reason' => 'Missing Bank Details',
        ]));

        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 15000,
            'total_net_disbursement' => 13000,
            'total_employer_statutory_cost' => 1950,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $childRun->id,
            'employee_id' => $this->employeeB->id,
            'is_excluded' => 0,
        ]));

        $response = $this->actingAs($this->admin)->get(route('payroll.payslips', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('items', 2)
        );
    }

    public function test_approval_page_shows_pending_supplementary_runs()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 15000,
            'total_net_disbursement' => 13000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $response = $this->actingAs($this->admin)->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollApproval')
            ->has('pendingSupplementaryRuns', 1)
            ->where('pendingSupplementaryRuns.0.id', $childRun->id)
            ->where('pendingSupplementaryRuns.0.status', 'draft')
        );
    }

    public function test_supplementary_run_approve_and_lock_merges_invoice()
    {
        // Seed agency GSTIN
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_gstin'],
            ['value' => '27AABCM1234N1ZQ', 'type' => 'string']
        );

        $this->client->update([
            'billing_model' => 'markup',
            'markup_percentage' => 10.0,
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeA->id,
        ]));

        // Generate parent run invoice
        $invoiceService = app(\App\Services\InvoiceGenerationService::class);
        $invoiceService->generateForRun($parentRun);

        $invoice = \App\Models\Invoice::where('payroll_run_id', $parentRun->id)->first();
        $this->assertNotNull($invoice);
        $initialGrandTotal = (float)$invoice->grand_total;

        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 15000,
            'total_net_disbursement' => 13000,
            'total_employer_statutory_cost' => 1950,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $childRun->id,
            'employee_id' => $this->employeeB->id,
        ]));

        // POST Approve
        $responseApprove = $this->actingAs($this->admin)->post("/payroll/{$childRun->id}/approve");
        $responseApprove->assertRedirect();
        $this->assertEquals('approved', $childRun->fresh()->status);

        // POST Lock
        $responseLock = $this->actingAs($this->admin)->post("/payroll/{$childRun->id}/lock");
        $responseLock->assertRedirect();
        $this->assertEquals('locked', $childRun->fresh()->status);

        // Verify parent invoice has been merged into
        $this->assertEquals(0, \App\Models\Invoice::where('payroll_run_id', $childRun->id)->count());
        $mergedInvoice = $invoice->fresh();
        $this->assertGreaterThan($initialGrandTotal, (float)$mergedInvoice->grand_total);

        // Verify Payslips list shows both employees
        $responsePayslips = $this->actingAs($this->admin)->get(route('payroll.payslips', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
        ]));
        $responsePayslips->assertStatus(200);
        $responsePayslips->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('items', 2)
        );
    }

    public function test_pending_supplementary_indicator_disappears_after_lock()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 15000,
            'total_net_disbursement' => 13000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $response = $this->actingAs($this->admin)->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollApproval')
            ->has('pendingSupplementaryRuns', 0)
        );
    }

    public function test_supplementary_approve_succeeds_lock_fails_leaves_approved_state()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 15000,
            'total_net_disbursement' => 13000,
            'total_employer_statutory_cost' => 1950,
        ]);

        // Mock the InvoiceGenerationService to throw an exception to make the lock() step fail
        $this->mock(\App\Services\InvoiceGenerationService::class, function ($mock) {
            $mock->shouldReceive('generateForRun')->andThrow(new \Exception("Mocked Invoice Generation Failure"));
        });

        // POST Approve should succeed and set status to approved
        $responseApprove = $this->actingAs($this->admin)->post("/payroll/{$childRun->id}/approve");
        $responseApprove->assertRedirect();
        $this->assertEquals('approved', $childRun->fresh()->status);

        // POST Lock should fail and leave status as approved
        $responseLock = $this->actingAs($this->admin)->post("/payroll/{$childRun->id}/lock");
        $responseLock->assertRedirect();
        $this->assertEquals('approved', $childRun->fresh()->status);

        // Check that pendingSupplementaryRuns contains this run with status = approved on next GET
        $response = $this->actingAs($this->admin)->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollApproval')
            ->has('pendingSupplementaryRuns', 1)
            ->where('pendingSupplementaryRuns.0.id', $childRun->id)
            ->where('pendingSupplementaryRuns.0.status', 'approved')
        );
    }

    public function test_index_processing_includes_supplementary_run_items()
    {
        $monthStart = '2026-07-01';

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => false,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => 10000,
            'total_net_disbursement' => 9000,
            'total_employer_statutory_cost' => 1300,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $this->employeeA->id,
        ]));

        $childRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
            'status' => 'locked',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'processed_by' => $this->admin->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 15000,
            'total_net_disbursement' => 13000,
            'total_employer_statutory_cost' => 1950,
        ]);

        DB::table('payroll_run_items')->insert($this->makePayrollRunItemData([
            'payroll_run_id' => $childRun->id,
            'employee_id' => $this->employeeB->id,
        ]));

        $response = $this->actingAs($this->admin)->get(route('payroll.processing', [
            'client_id' => $this->client->id,
            'payroll_month' => $monthStart,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/PayrollProcessing')
            ->has('items', 2)
            ->where('run.total_gross_earnings', 25000)
            ->where('run.total_net_disbursement', 22000)
        );
    }
}

