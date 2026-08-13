<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\SalaryCalculationService;
use App\Services\MonthlyPayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EmployeeDisabilityEsiCeilingTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Client $client;
    protected ClientBranch $branch;
    protected SalaryCalculationService $salaryService;
    protected MonthlyPayrollCalculator $payrollCalculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salaryService = app(SalaryCalculationService::class);
        $this->payrollCalculator = app(MonthlyPayrollCalculator::class);

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'PwD Test Establishment',
            'client_code' => 'PWDTEST',
            'status' => 'active',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'esi_limit' => 21000.00,
            'contract_type' => 'eor',
            'registered_state' => 'Tamil Nadu',
        ]);

        $this->branch = ClientBranch::factory()->create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main Branch',
            'branch_code' => 'MB01',
            'state' => 'Tamil Nadu',
            'pin_code' => '600001',
            'is_primary_billing_branch' => true,
        ]);
    }

    /**
     * Test 1: Disabled employee with gross ₹23,000 (above normal ₹21k, below PwD ₹25k) -> ESI IS deducted.
     */
    public function test_disabled_employee_earning_23000_has_esi_deducted_in_structural_calculation(): void
    {
        $payload = [
            'client_id' => $this->client->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 3000,
            'other_additions' => 0,
            'is_disabled' => true,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_applicable' => false,
        ];

        $structure = $this->salaryService->calculateStructuralSalary($payload);

        $this->assertEquals(23000.00, $structure['gross_monthly_salary']);
        // Gross 23,000 <= 25,000 -> ESI must be active
        $this->assertGreaterThan(0, $structure['employee_esi_monthly']);
        $this->assertGreaterThan(0, $structure['employer_esi_monthly']);
        $this->assertEquals(round(23000 * 0.0075, 2), $structure['employee_esi_monthly']);
        $this->assertEquals(round(23000 * 0.0325, 2), $structure['employer_esi_monthly']);
    }

    /**
     * Test 2: Standard non-disabled employee with gross ₹23,000 -> ESI is NOT deducted (₹0.00).
     */
    public function test_non_disabled_employee_earning_23000_has_zero_esi(): void
    {
        $payload = [
            'client_id' => $this->client->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 3000,
            'other_additions' => 0,
            'is_disabled' => false,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_applicable' => false,
        ];

        $structure = $this->salaryService->calculateStructuralSalary($payload);

        $this->assertEquals(23000.00, $structure['gross_monthly_salary']);
        // Gross 23,000 > standard 21,000 -> ESI must be 0
        $this->assertEquals(0.00, $structure['employee_esi_monthly']);
        $this->assertEquals(0.00, $structure['employer_esi_monthly']);
    }

    /**
     * Test 3: Disabled employee with gross ₹27,000 (> PwD ₹25k) -> ESI is NOT deducted (₹0.00).
     */
    public function test_disabled_employee_earning_27000_has_zero_esi(): void
    {
        $payload = [
            'client_id' => $this->client->id,
            'basic_pay' => 15000,
            'hra' => 7000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 5000,
            'other_additions' => 0,
            'is_disabled' => true,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_applicable' => false,
        ];

        $structure = $this->salaryService->calculateStructuralSalary($payload);

        $this->assertEquals(27000.00, $structure['gross_monthly_salary']);
        // Gross 27,000 > PwD 25,000 -> ESI must be 0
        $this->assertEquals(0.00, $structure['employee_esi_monthly']);
        $this->assertEquals(0.00, $structure['employer_esi_monthly']);
    }

    /**
     * Test 4: Section 46 Continuity Engine for Disabled Employee.
     * Starts April at ₹23,000 (ESI active under ₹25k ceiling).
     * Salary hikes to ₹28,000 in July (mid-period).
     * Continuity rule ensures ESI is deducted on full ₹28,000 through September 30.
     */
    public function test_monthly_payroll_calculator_section_46_continuity_for_disabled_employee(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'PWD-46-001',
            'full_name' => 'Disabled Worker Section 46',
            'personal_email' => 'pwd46@test.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1992-05-10',
            'date_of_joining' => '2026-04-01',
            'designation' => 'Analyst',
            'employment_model' => 'eor',
            'is_disabled' => true,
            'disability_type' => 'locomotor',
            'disability_percentage' => 50,
            'basic_pay' => 15000,
            'hra' => 5000,
            'special_allowance' => 3000, // Gross = 23,000 in April
            'gross_monthly_salary' => 23000,
            'pf_applicable' => true,
            'esi_applicable' => true,
            'status' => 'active',
        ]);

        // 1. April 2026 Calculation (Start of period, Gross 23k <= 25k)
        $aprilRun = \App\Models\PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-04-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_gross_earnings' => 23000,
            'total_net_disbursement' => 20000,
            'total_employer_statutory_cost' => 2697.5,
        ]);
        $aprilCalc = $this->payrollCalculator->calculateForEmployee($employee, $aprilRun, ['paid_days' => 30, 'lop_days' => 0]);
        $this->assertGreaterThan(0, $aprilCalc['employee_esi']);
        $this->assertEquals(round(23000 * 0.0075, 2), $aprilCalc['employee_esi']);

        // 2. Mid-period Hike in July 2026: Salary increases to ₹28,000
        $employee->special_allowance = 8000;
        $employee->gross_monthly_salary = 28000;
        $employee->save();

        $julyRun = \App\Models\PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_gross_earnings' => 28000,
            'total_net_disbursement' => 24000,
            'total_employer_statutory_cost' => 3000,
        ]);
        $julyCalc = $this->payrollCalculator->calculateForEmployee($employee, $julyRun, ['paid_days' => 31, 'lop_days' => 0]);
        
        // Continuity rule must maintain ESI active despite gross 28k exceeding 25k ceiling
        $this->assertGreaterThan(0, $julyCalc['employee_esi'], 'Section 46 continuity failed for PwD employee');
        $this->assertNotNull($employee->fresh()->esi_threshold_crossed_month);
        $this->assertEquals(round(28000 * 0.0075, 2), $julyCalc['employee_esi']);
    }

    /**
     * Test 5: Validation layer strictly rejects disability_percentage < 40 with 422 error.
     */
    public function test_validation_rejects_disability_percentage_under_40(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('employees.store'), [
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'PWD-VAL-001',
            'first_name' => 'Under',
            'last_name' => 'Benchmark',
            'father_name' => 'Father Name',
            'full_name' => 'Under Benchmark Worker',
            'personal_email' => 'under40@test.com',
            'phone_number' => '9876543211',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Staff',
            'employment_model' => 'eor',
            'prior_employment_flag' => 1,
            'is_disabled' => true,
            'disability_percentage' => 30, // Less than 40% benchmark
            'pan_number' => 'ABCDE1234F',
            'bank_account_number' => '123456789012',
            'bank_ifsc' => 'SBIN0001234',
            'basic_pay' => 15000,
            'hra' => 5000,
            'residential_address' => '123 Test Road',
            'account_holder_name' => 'Under Benchmark Worker',
        ]);

        $response->assertSessionHasErrors('disability_percentage');
    }

    /**
     * Test 6: Validation layer accepts disability_percentage >= 40.
     */
    public function test_validation_accepts_valid_disability_percentage(): void
    {
        $payload = [
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'PWD-VAL-002',
            'first_name' => 'Valid',
            'last_name' => 'Benchmark',
            'father_name' => 'Father Name',
            'full_name' => 'Valid Benchmark Worker',
            'personal_email' => 'valid40@test.com',
            'phone_number' => '9876543212',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Staff',
            'gender' => 'male',
            'marital_status' => 'single',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'is_disabled' => true,
            'disability_type' => 'locomotor',
            'disability_percentage' => 45, // >= 40% benchmark
            'udid_card_number' => 'TN1234567890',
            'pan_number' => 'ABCDE1234G',
            'bank_account_number' => '123456789013',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'bank_branch' => 'Main Branch',
            'account_holder_name' => 'Valid Benchmark Worker',
            'residential_address' => '123 Test Road',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => 1,
            'esi_applicable' => 1,
            'pt_applicable' => 1,
            'lwf_applicable' => 0,
            'tds_applicable' => 0,
            'uan_mode' => 'new',
            'esi_mode' => 'new',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '26',
            'declarations_accepted' => 'yes',
        ];

        $response = $this->actingAs($this->adminUser)->post(route('employees.store'), $payload);

        $response->assertSessionDoesntHaveErrors();
        $this->assertDatabaseHas('employees', [
            'personal_email' => 'valid40@test.com',
            'is_disabled' => 1,
            'disability_percentage' => 45,
            'udid_card_number' => 'TN1234567890',
        ]);
    }
}
