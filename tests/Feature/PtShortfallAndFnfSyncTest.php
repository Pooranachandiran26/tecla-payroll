<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Services\FullAndFinalCalculationService;
use App\Services\MonthlyPayrollCalculator;
use App\Services\PtChallanGeneratorService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class PtShortfallAndFnfSyncTest extends TestCase
{
    use RefreshDatabase;

    protected $adminUser;
    protected $clientTN;
    protected $clientKA;
    protected $branchTN;
    protected $branchKA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->clientTN = Client::factory()->create([
            'company_name' => 'Tamil Nadu Tech Corp',
            'registered_state' => 'Tamil Nadu',
            'pt_state' => 'Tamil Nadu',
        ]);

        $this->branchTN = \App\Models\ClientBranch::factory()->create([
            'client_id' => $this->clientTN->id,
            'state' => 'Tamil Nadu',
        ]);

        $this->clientKA = Client::factory()->create([
            'company_name' => 'Karnataka Software Ltd',
            'registered_state' => 'Karnataka',
            'pt_state' => 'Karnataka',
        ]);

        $this->branchKA = \App\Models\ClientBranch::factory()->create([
            'client_id' => $this->clientKA->id,
            'state' => 'Karnataka',
        ]);
    }

    /**
     * Requirement 2: DB Proof that all 6 Tamil Nadu tiers show clean round statutory half_yearly_amount.
     */
    public function test_all_tamil_nadu_pt_slabs_have_clean_statutory_half_yearly_amounts(): void
    {
        $tnSlabs = DB::table('pt_slabs')
            ->where('state', 'Tamil Nadu')
            ->orderBy('min_salary')
            ->get();

        $this->assertCount(6, $tnSlabs);

        $expectedStatutoryTiers = [
            ['min' => 0.00, 'max' => 3500.00, 'monthly' => 0.00, 'half_yearly' => 0.00],
            ['min' => 3501.00, 'max' => 5000.00, 'monthly' => 30.00, 'half_yearly' => 180.00],
            ['min' => 5001.00, 'max' => 7500.00, 'monthly' => 70.83, 'half_yearly' => 425.00],
            ['min' => 7501.00, 'max' => 10000.00, 'monthly' => 155.00, 'half_yearly' => 930.00],
            ['min' => 10001.00, 'max' => 12500.00, 'monthly' => 170.83, 'half_yearly' => 1025.00],
            ['min' => 12501.00, 'max' => null, 'monthly' => 208.33, 'half_yearly' => 1250.00],
        ];

        foreach ($tnSlabs as $index => $slab) {
            $expected = $expectedStatutoryTiers[$index];
            $this->assertEquals((float)$expected['min'], (float)$slab->min_salary);
            if ($expected['max'] === null) {
                $this->assertNull($slab->max_salary);
            } else {
                $this->assertEquals((float)$expected['max'], (float)$slab->max_salary);
            }
            $this->assertEquals((float)$expected['monthly'], (float)$slab->deduction_amount);
            $this->assertEquals((float)$expected['half_yearly'], (float)$slab->half_yearly_amount, "Tier {$index} half_yearly_amount must be exactly ₹{$expected['half_yearly']}");
        }
    }

    /**
     * Requirement 1 & Test 1: Employee joins Aug 1 (Month 5), exits Sep 30 (Month 6).
     * Shortfall = 1,250.00 - 208.33 = ₹1,041.67 (NOT ₹1,041.65).
     */
    public function test_aug_to_sep_exit_calculates_exact_1041_67_shortfall_and_syncs_to_payroll(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->clientTN->id,
            'branch_id' => $this->branchTN->id,
            'employee_code' => 'EMP-TN-001',
            'first_name' => 'Pooran',
            'last_name' => 'Chandran',
            'date_of_joining' => '2026-08-01',
            'basic_pay' => 25000.00,
            'hra' => 10000.00,
            'special_allowance' => 10000.00,
            'gross_monthly_salary' => 45000.00,
            'pt_applicable' => true,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'lwf_applicable' => false,
            'pan_number' => 'ABCDE1111A',
            'bank_account_number' => '123456789010',
            'aadhaar_number' => '100000000010',
            'status' => 'active',
        ]);

        // Seed 30 days present attendance in Sep
        for ($d = 1; $d <= 30; $d++) {
            DB::table('attendance_records')->insert([
                'employee_id' => $employee->id,
                'attendance_date' => "2026-09-" . str_pad($d, 2, '0', STR_PAD_LEFT),
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 1. Create August 2026 locked payroll run with standard ₹208.33 PT deduction
        $augPayrollRun = PayrollRun::create([
            'client_id' => $this->clientTN->id,
            'payroll_month' => '2026-08-01',
            'status' => 'locked',
            'processed_by' => $this->adminUser->id,
        ]);

        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $augPayrollRun->id,
            'employee_id' => $employee->id,
            'paid_days' => 31,
            'lop_days' => 0,
            'gross_total' => 45000.00,
            'basic_pay' => 25000.00,
            'hra' => 10000.00,
            'special_allowance' => 10000.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'conveyance' => 0.00,
            'other_additions' => 0.00,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 208.33,
            'pt_shortfall_recovery' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 44791.67,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. F&F Calculation for September 30 Last Working Day
        $fnfService = app(FullAndFinalCalculationService::class);
        $preview = $fnfService->calculatePreview($employee, [
            'last_working_day' => '2026-09-30',
            'notice_days_required' => 30,
            'notice_days_served' => 30,
        ]);

        // VERIFY: Full liability (1,250.00) - Aug Deducted (208.33) = exactly 1,041.67
        $this->assertEquals(1041.67, $preview['pt_shortfall_recovery'], 'Shortfall MUST be exactly ₹1,041.67 (1,250.00 - 208.33)');

        // Store into employee_exits as approved
        DB::table('employee_exits')->insert([
            'employee_id' => $employee->id,
            'exit_type' => 'Resignation',
            'submission_date' => '2026-08-31',
            'last_working_day' => '2026-09-30',
            'settlement_status' => 'approved',
            'pt_shortfall_recovery' => $preview['pt_shortfall_recovery'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Run September 2026 Monthly Payroll for Tamil Nadu Client
        $sepPayrollRun = PayrollRun::create([
            'client_id' => $this->clientTN->id,
            'payroll_month' => '2026-09-01',
            'status' => 'draft',
            'processed_by' => $this->adminUser->id,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $sepPayrollRun);

        // VERIFY: payroll_run_items received the synced shortfall recovery
        $this->assertEquals(208.33, (float)$result['professional_tax']);
        $this->assertEquals(1041.67, (float)$result['pt_shortfall_recovery']);

        $runItem = DB::table('payroll_run_items')
            ->where('payroll_run_id', $sepPayrollRun->id)
            ->where('employee_id', $employee->id)
            ->first();

        $this->assertNotNull($runItem);
        $this->assertEquals(208.33, (float)$runItem->professional_tax);
        $this->assertEquals(1041.67, (float)$runItem->pt_shortfall_recovery);
        
        // Total PT deducted in Sep = 208.33 + 1041.67 = 1250.00 (Net pay = 45000 - 1250 = 43750.00)
        $this->assertEquals(43750.00, (float)$runItem->net_pay);
    }

    /**
     * Test 2: Employee joins Apr 1 (Month 1), exits May 31 (Month 2).
     * Shortfall = 1,250.00 - 208.33 = ₹1,041.67.
     */
    public function test_apr_to_may_exit_calculates_exact_1041_67_shortfall(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->clientTN->id,
            'branch_id' => $this->branchTN->id,
            'employee_code' => 'EMP-TN-002',
            'first_name' => 'Kavitha',
            'last_name' => 'Raman',
            'date_of_joining' => '2026-04-01',
            'basic_pay' => 25000.00,
            'hra' => 10000.00,
            'special_allowance' => 10000.00,
            'gross_monthly_salary' => 45000.00,
            'pt_applicable' => true,
            'pan_number' => 'ABCDE2222A',
            'bank_account_number' => '123456789020',
            'aadhaar_number' => '100000000020',
            'status' => 'active',
        ]);

        // April 2026 locked payroll run
        $aprPayrollRun = PayrollRun::create([
            'client_id' => $this->clientTN->id,
            'payroll_month' => '2026-04-01',
            'status' => 'locked',
            'processed_by' => $this->adminUser->id,
        ]);

        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $aprPayrollRun->id,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'gross_total' => 45000.00,
            'basic_pay' => 25000.00,
            'hra' => 10000.00,
            'special_allowance' => 10000.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'conveyance' => 0.00,
            'other_additions' => 0.00,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 208.33,
            'pt_shortfall_recovery' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 44791.67,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // May 31 Last Working Day
        $fnfService = app(FullAndFinalCalculationService::class);
        $preview = $fnfService->calculatePreview($employee, [
            'last_working_day' => '2026-05-31',
        ]);

        $this->assertEquals(1041.67, $preview['pt_shortfall_recovery']);
    }

    /**
     * Requirement 4: Karnataka and Maharashtra monthly states show ₹0.00 shortfall (Zero regression).
     */
    public function test_monthly_state_employees_show_zero_shortfall(): void
    {
        $employeeKA = Employee::factory()->create([
            'client_id' => $this->clientKA->id,
            'branch_id' => $this->branchKA->id,
            'employee_code' => 'EMP-KA-001',
            'first_name' => 'Suresh',
            'last_name' => 'Kumar',
            'date_of_joining' => '2026-08-01',
            'basic_pay' => 25000.00,
            'gross_monthly_salary' => 35000.00,
            'pt_applicable' => true,
            'pan_number' => 'ABCDE3333A',
            'bank_account_number' => '123456789030',
            'aadhaar_number' => '100000000030',
            'status' => 'active',
        ]);

        $fnfService = app(FullAndFinalCalculationService::class);
        $preview = $fnfService->calculatePreview($employeeKA, [
            'last_working_day' => '2026-09-30',
        ]);

        $this->assertEquals(0.00, $preview['pt_shortfall_recovery'], 'Monthly states like Karnataka must have 0.00 shortfall recovery');
    }

    /**
     * Requirement 3: PT Challan Generator output sums standard PT and shortfall recovery.
     */
    public function test_pt_challan_generator_sums_standard_pt_and_shortfall_recovery(): void
    {
        $payrollRun = PayrollRun::create([
            'client_id' => $this->clientTN->id,
            'payroll_month' => '2026-09-01',
            'status' => 'locked',
            'processed_by' => $this->adminUser->id,
        ]);

        $emp1 = Employee::factory()->create([
            'client_id' => $this->clientTN->id,
            'branch_id' => $this->branchTN->id,
            'employee_code' => 'EMP-01',
            'first_name' => 'Active',
            'last_name' => 'Worker',
            'gross_monthly_salary' => 45000.00,
            'pt_applicable' => true,
            'pan_number' => 'ABCDE4444A',
            'bank_account_number' => '123456789040',
            'aadhaar_number' => '100000000040',
            'status' => 'active',
        ]);

        $emp2 = Employee::factory()->create([
            'client_id' => $this->clientTN->id,
            'branch_id' => $this->branchTN->id,
            'employee_code' => 'EMP-02',
            'first_name' => 'Exiting',
            'last_name' => 'Worker',
            'gross_monthly_salary' => 45000.00,
            'pt_applicable' => true,
            'pan_number' => 'ABCDE5555A',
            'bank_account_number' => '123456789050',
            'aadhaar_number' => '100000000050',
            'status' => 'exited',
        ]);

        // Regular employee: standard 208.33
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $emp1->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'gross_total' => 45000.00,
            'basic_pay' => 45000.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 208.33,
            'pt_shortfall_recovery' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 44791.67,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Exiting employee: standard 208.33 + shortfall 1041.67 = 1250.00
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $emp2->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'gross_total' => 45000.00,
            'basic_pay' => 45000.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 208.33,
            'pt_shortfall_recovery' => 1041.67,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 43750.00,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $challanService = app(PtChallanGeneratorService::class);
        $preview = $challanService->preview($payrollRun->id);

        $this->assertEquals(2, $preview['employee_count']);
        // Total PT: 208.33 + (208.33 + 1041.67) = 1458.33
        $this->assertEquals(1458.33, (float)$preview['total_pt_amount']);
    }

    /**
     * Requirement 5: Payslip Blade partial renders PT Shortfall Recovery as a distinct row.
     */
    public function test_payslip_blade_renders_pt_shortfall_recovery_as_distinct_line_item(): void
    {
        $item = (object)[
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 208.33,
            'pt_shortfall_recovery' => 1041.67,
            'lwf_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'basic_pay' => 45000.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => 45000.00,
        ];

        $rendered = view('pdf.partials.salary_components', [
            'item' => $item,
            'templateKey' => 'standard',
            'accentColor' => '#1e3a8a',
            'visibleSections' => [
                'show_pf_details' => true,
                'show_esi_details' => true,
                'show_pt_details' => true,
                'show_lwf_details' => true,
                'show_tds_deduction' => true,
                'show_lop_deduction' => false,
                'show_standard_salary' => false,
            ],
        ])->render();

        $this->assertStringContainsString('Professional Tax', $rendered);
        $this->assertStringContainsString('208.33', $rendered);
        $this->assertStringContainsString('PT Shortfall Recovery', $rendered);
        $this->assertStringContainsString('1,041.67', $rendered);
        $this->assertStringContainsString('1,250.00', $rendered); // Total deductions
    }
}
