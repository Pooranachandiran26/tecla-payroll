<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Services\SalaryCalculationService;
use App\Services\MonthlyPayrollCalculator;
use App\Services\PfEcrGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EmployeeVpfCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Client $clientCeiling;
    protected Client $clientActual;
    protected ClientBranch $branchCeiling;
    protected ClientBranch $branchActual;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->clientCeiling = Client::factory()->create([
            'company_name' => 'Ceiling PF Client Pvt Ltd',
            'client_code' => 'CL-CEIL',
            'status' => 'active',
            'contract_type' => 'eor',
            'pf_applicable' => true,
            'pf_ceiling' => 15000,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
            'esi_applicable' => false,
        ]);

        $this->branchCeiling = ClientBranch::factory()->create([
            'client_id' => $this->clientCeiling->id,
            'branch_name' => 'Main Branch',
            'branch_code' => 'BR-01',
            'state' => 'Tamil Nadu',
            'is_primary_billing_branch' => true,
        ]);

        $this->clientActual = Client::factory()->create([
            'company_name' => 'Actual PF Client Pvt Ltd',
            'client_code' => 'CL-ACT',
            'status' => 'active',
            'contract_type' => 'eor',
            'pf_applicable' => true,
            'pf_ceiling' => 15000,
            'employee_pf_wage_basis' => 'actual_basic_da',
            'employer_pf_wage_basis' => 'actual_basic_da',
            'esi_applicable' => false,
        ]);

        $this->branchActual = ClientBranch::factory()->create([
            'client_id' => $this->clientActual->id,
            'branch_name' => 'Head Office',
            'branch_code' => 'BR-ACT-01',
            'state' => 'Maharashtra',
            'is_primary_billing_branch' => true,
        ]);
    }

    /**
     * Test 1: VPF Percentage is calculated on REAL Actual Basic+DA even when Mandatory EPF is on 'ceiling' basis.
     * Basic = ₹50,000. Mandatory EPF = 12% of ₹15,000 = ₹1,800.
     * VPF = 10% of ₹50,000 = ₹5,000 (NOT 10% of ₹15,000).
     * Total Employee PF = ₹6,800.
     */
    public function test_vpf_percentage_calculated_on_actual_basic_da_when_mandatory_pf_is_on_ceiling_wage_basis(): void
    {
        $service = app(SalaryCalculationService::class);

        $payload = [
            'client_id' => $this->clientCeiling->id,
            'basic_pay' => 50000,
            'hra' => 20000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'vpf_enabled' => true,
            'vpf_type' => 'percentage',
            'vpf_value' => 10.0,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ];

        $calc = $service->calculateStructuralSalary($payload);

        $this->assertEquals(1800.00, $calc['employee_pf_monthly'], 'Mandatory EPF must be capped at 12% of 15,000 = 1,800.00');
        $this->assertEquals(5000.00, $calc['employee_vpf_monthly'], 'VPF 10% must be calculated on actual Basic (50,000 * 10% = 5,000.00)');
        $this->assertEquals(6800.00, $calc['total_employee_pf_monthly'], 'Total Employee PF must be 1,800 + 5,000 = 6,800.00');
        $this->assertEquals(70000.00, $calc['gross_monthly_salary'], 'Gross salary is 50,000 + 20,000 = 70,000.00');
        $this->assertEquals(63200.00, $calc['net_take_home_monthly'], 'Net take home must be 70,000 - 6,800 = 63,200.00');
    }

    /**
     * Test 2: VPF Percentage on Actual Basic+DA when Mandatory EPF is on 'actual_basic_da' basis.
     * Basic = ₹50,000. Mandatory EPF = 12% of ₹50,000 = ₹6,000.
     * VPF = 10% of ₹50,000 = ₹5,000.
     * Total Employee PF = ₹11,000.
     */
    public function test_vpf_percentage_calculated_on_actual_basic_da_when_mandatory_pf_is_on_actual_basic_da_wage_basis(): void
    {
        $service = app(SalaryCalculationService::class);

        $payload = [
            'client_id' => $this->clientActual->id,
            'basic_pay' => 50000,
            'hra' => 20000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'vpf_enabled' => true,
            'vpf_type' => 'percentage',
            'vpf_value' => 10.0,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'employee_pf_wage_basis' => 'actual_basic_da',
            'employer_pf_wage_basis' => 'actual_basic_da',
        ];

        $calc = $service->calculateStructuralSalary($payload);

        $this->assertEquals(6000.00, $calc['employee_pf_monthly'], 'Mandatory EPF must be 12% of 50,000 = 6,000.00');
        $this->assertEquals(5000.00, $calc['employee_vpf_monthly'], 'VPF 10% must be 50,000 * 10% = 5,000.00');
        $this->assertEquals(11000.00, $calc['total_employee_pf_monthly'], 'Total Employee PF must be 6,000 + 5,000 = 11,000.00');
        $this->assertEquals(59000.00, $calc['net_take_home_monthly'], 'Net take home must be 70,000 - 11,000 = 59,000.00');
    }

    /**
     * Test 3: VPF Fixed Amount calculation and net take home impact.
     * Basic = ₹40,000, DA = ₹5,000 (Basic+DA = ₹45,000).
     * Mandatory EPF (ceiling) = ₹1,800.
     * VPF = fixed ₹3,500.00.
     * Total Employee PF = ₹5,300.00.
     */
    public function test_vpf_fixed_amount_deduction_and_net_take_home(): void
    {
        $service = app(SalaryCalculationService::class);

        $payload = [
            'client_id' => $this->clientCeiling->id,
            'basic_pay' => 40000,
            'hra' => 15000,
            'conveyance' => 0,
            'da' => 5000,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'vpf_enabled' => true,
            'vpf_type' => 'fixed_amount',
            'vpf_value' => 3500.00,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ];

        $calc = $service->calculateStructuralSalary($payload);

        $this->assertEquals(1800.00, $calc['employee_pf_monthly']);
        $this->assertEquals(3500.00, $calc['employee_vpf_monthly']);
        $this->assertEquals(5300.00, $calc['total_employee_pf_monthly']);
        $this->assertEquals(60000.00, $calc['gross_monthly_salary']); // 40k + 15k + 5k
        $this->assertEquals(54700.00, $calc['net_take_home_monthly']); // 60,000 - 5,300
    }

    /**
     * Test 4: Invariant Check: Employer EPF, EPS, EDLI, and EPF admin charges remain 100% identical with and without VPF.
     */
    public function test_employer_statutory_costs_remain_invariant_with_and_without_vpf(): void
    {
        $service = app(SalaryCalculationService::class);

        $basePayload = [
            'client_id' => $this->clientCeiling->id,
            'basic_pay' => 60000,
            'hra' => 20000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ];

        $calcWithoutVpf = $service->calculateStructuralSalary(array_merge($basePayload, [
            'vpf_enabled' => false,
        ]));

        $calcWithVpf = $service->calculateStructuralSalary(array_merge($basePayload, [
            'vpf_enabled' => true,
            'vpf_type' => 'percentage',
            'vpf_value' => 25.0,
        ]));

        $this->assertEquals($calcWithoutVpf['employer_pf_monthly'], $calcWithVpf['employer_pf_monthly']);
        $this->assertEquals($calcWithoutVpf['employer_epf_monthly'], $calcWithVpf['employer_epf_monthly']);
        $this->assertEquals($calcWithoutVpf['employer_eps_monthly'], $calcWithVpf['employer_eps_monthly']);
        $this->assertEquals($calcWithoutVpf['edli_monthly'], $calcWithVpf['edli_monthly']);
        $this->assertEquals($calcWithoutVpf['epf_admin_monthly'], $calcWithVpf['epf_admin_monthly']);
        $this->assertEquals($calcWithoutVpf['ctc_monthly'], $calcWithVpf['ctc_monthly'], 'Total CTC should be invariant because VPF is 100% employee-funded');
        
        $this->assertEquals(0.00, $calcWithoutVpf['employee_vpf_monthly']);
        $this->assertEquals(15000.00, $calcWithVpf['employee_vpf_monthly']); // 60,000 * 25% = 15,000
    }

    /**
     * Test 5: Ceiling Validation: Error if VPF percentage > 88% or fixed amount > (Basic+DA - Mandatory EPF).
     */
    public function test_vpf_ceiling_and_validation_rules(): void
    {
        $this->actingAs($this->adminUser);

        // Submitting percentage > 88%
        $response1 = $this->postJson(route('employees.store'), [
            'client_id' => $this->clientCeiling->id,
            'branch_id' => $this->branchCeiling->id,
            'first_name' => 'Rahul',
            'last_name' => 'Sharma',
            'father_name' => 'Suresh Sharma',
            'personal_email' => 'rahul.vpf.test@example.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1995-05-15',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Tech Lead',
            'residential_address' => '123 Main Street',
            'bank_account_number' => '123456789012',
            'bank_account_number_confirmation' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'bank_branch' => 'Main Branch',
            'account_holder_name' => 'Rahul Sharma',
            'pan_number' => 'ABCDE1234F',
            'basic_pay' => 30000,
            'hra' => 15000,
            'pf_applicable' => 1,
            'vpf_enabled' => 1,
            'vpf_type' => 'percentage',
            'vpf_value' => 89.0, // Exceeds 88%
            'declarations_accepted' => 1,
        ]);

        $response1->assertStatus(422);
        $response1->assertJsonValidationErrors(['vpf_value']);

        // Submitting fixed amount > (Basic - Mandatory EPF)
        // Basic = 20,000. Mandatory EPF = 1,800. Max fixed = 18,200. We submit 19,000.
        $response2 = $this->postJson(route('employees.store'), [
            'client_id' => $this->clientCeiling->id,
            'branch_id' => $this->branchCeiling->id,
            'first_name' => 'Amit',
            'last_name' => 'Verma',
            'father_name' => 'Rajesh Verma',
            'personal_email' => 'amit.vpf.test@example.com',
            'phone_number' => '9876543211',
            'date_of_birth' => '1995-05-15',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Tech Lead',
            'residential_address' => '123 Main Street',
            'bank_account_number' => '123456789012',
            'bank_account_number_confirmation' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'bank_branch' => 'Main Branch',
            'account_holder_name' => 'Amit Verma',
            'pan_number' => 'ABCDE1234G',
            'basic_pay' => 20000,
            'hra' => 10000,
            'pf_applicable' => 1,
            'vpf_enabled' => 1,
            'vpf_type' => 'fixed_amount',
            'vpf_value' => 19000.00, // Exceeds 20,000 - 1,800 = 18,200
            'declarations_accepted' => 1,
        ]);

        $response2->assertStatus(422);
        $response2->assertJsonValidationErrors(['vpf_value']);
    }

    /**
     * Test 6: ECR Generator Field 7 (sums mandatory + VPF) and Field 9 (untouched employer EPF).
     */
    public function test_pf_ecr_generator_field_7_and_field_9_formatting_with_vpf(): void
    {
        $this->clientCeiling->update(['pf_establishment_code' => 'DLCPM0012345000']);

        $employee = Employee::factory()->create([
            'client_id' => $this->clientCeiling->id,
            'branch_id' => $this->branchCeiling->id,
            'employee_code' => 'VPF-EMP-001',
            'full_name' => 'VPF Candidate Test',
            'personal_email' => 'vpf.candidate@example.com',
            'phone_number' => '9876543212',
            'date_of_birth' => '1992-06-15',
            'date_of_joining' => '2023-01-01',
            'designation' => 'Developer',
            'status' => 'active',
            'basic_pay' => 50000,
            'hra' => 20000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'vpf_enabled' => true,
            'vpf_type' => 'percentage',
            'vpf_value' => 10.0,
            'uan_number' => '100123456789',
            'pf_member_id' => 'DLCPM00123450000000101',
            'member_relationship' => 'F',
            'gross_monthly_salary' => 70000,
            'net_take_home_monthly' => 63200,
            'ctc_monthly' => 71950,
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
            'pan_number' => 'ABCDE1234H',
            'residential_address' => '123 Test Street',
            'declarations_accepted' => true,
        ]);

        $run = PayrollRun::create([
            'client_id' => $this->clientCeiling->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        $runItem = PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 50000,
            'hra' => 20000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 70000,
            'employee_pf' => 1800.00,
            'employee_vpf' => 5000.00,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 63200.00,
            'employer_pf' => 1800.00,
            'employer_esi' => 0,
            'attendance_source' => 'live_punch',
            'is_excluded' => false,
        ]);

        $run->update([
            'status' => 'locked',
            'locked_at' => now(),
            'locked_by' => $this->adminUser->id,
        ]);

        $ecrService = app(PfEcrGeneratorService::class);
        $result = $ecrService->generate($run->id, $this->adminUser->id);

        $this->assertTrue($result['success']);
        $ecrText = \Illuminate\Support\Facades\Storage::disk('local')->get($result['file_path']);

        $lines = explode("\r\n", trim($ecrText));
        $this->assertNotEmpty($lines);
        $fields = explode('#~#', $lines[0]);

        // Field 0: UAN
        $this->assertEquals('100123456789', $fields[0]);
        // Field 1: Member Name
        $this->assertEquals('VPF Candidate Test', $fields[1]);
        // Field 2: Gross Wages
        $this->assertEquals('70000', $fields[2]);
        // Field 3: EPF Wages (Capped at 15,000 for ceiling client)
        $this->assertEquals('15000', $fields[3]);
        // Field 4: EPS Wages
        $this->assertEquals('15000', $fields[4]);
        // Field 5: EDLI Wages
        $this->assertEquals('15000', $fields[5]);
        // Field 6: EE EPF Share Remitted (Field 7 in 1-based index) -> MUST BE sum of employee_pf (1,800) + employee_vpf (5,000) = 6,800
        $this->assertEquals('6800', $fields[6], 'Field 7 in ECR must be sum of mandatory EPF and VPF = 6,800');
        // Field 7: EPS Contribution (Field 8 in 1-based index) -> 1,250 (rounded)
        $this->assertEquals('1250', $fields[7]);
        // Field 8: ER EPF Share Remitted (Field 9 in 1-based index) -> MUST BE employer_epf = 550 (1800 - 1250), untouched by VPF
        $this->assertEquals('550', $fields[8], 'Field 9 in ECR must be employer EPF share without VPF distortion = 550');
    }

    /**
     * Test 7: MonthlyPayrollCalculator persists VPF distinctly and deducts from net pay.
     */
    public function test_monthly_payroll_calculator_persists_vpf_and_deducts_from_net_pay(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->clientCeiling->id,
            'branch_id' => $this->branchCeiling->id,
            'employee_code' => 'VPF-RUN-001',
            'full_name' => 'Monthly Run VPF Candidate',
            'personal_email' => 'monthly.vpf@example.com',
            'phone_number' => '9876543213',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2024-01-01',
            'attendance_tracking_start_date' => '2024-01-01',
            'designation' => 'Senior Developer',
            'status' => 'active',
            'basic_pay' => 40000,
            'hra' => 10000,
            'special_allowance' => 0,
            'lop_basis_days' => 30,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'vpf_enabled' => true,
            'vpf_type' => 'fixed_amount',
            'vpf_value' => 2000.00,
            'uan_number' => '100999888777',
            'pf_member_id' => 'DLCPM00123450000000999',
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
            'pan_number' => 'ABCDE1234I',
            'residential_address' => '123 Test Street',
            'declarations_accepted' => true,
        ]);

        \Illuminate\Support\Facades\DB::table('attendance_records')->insert(
            array_map(fn($day) => [
                'employee_id' => $employee->id,
                'attendance_date' => sprintf('2026-08-%02d', $day),
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ], range(1, 31))
        );

        $payrollRun = PayrollRun::create([
            'client_id' => $this->clientCeiling->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        $monthlyCalc = app(MonthlyPayrollCalculator::class);
        $res = $monthlyCalc->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(1800.00, (float)$res['employee_pf']);
        $this->assertEquals(2000.00, (float)$res['employee_vpf']);
        $this->assertEquals(50000.00, (float)$res['gross_total']); // 40k basic + 10k hra
        
        $expectedNetPay = round($res['gross_total'] - $res['employee_pf'] - $res['employee_vpf'] - $res['professional_tax'] - $res['tds_deduction'] - $res['employee_esi'] - $res['lwf_deduction'], 2);
        $this->assertEquals($expectedNetPay, round((float)$res['net_pay'], 2));
    }
}
