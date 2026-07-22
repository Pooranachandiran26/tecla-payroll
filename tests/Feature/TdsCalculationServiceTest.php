<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeTaxDeclaration;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\MonthlyPayrollCalculator;
use App\Services\TdsCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TdsCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected TdsCalculationService $tdsService;
    protected Client $client;
    protected ClientBranch $branch;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tdsService = new TdsCalculationService();

        $this->client = Client::factory()->create(['company_name' => 'Tax Test Corp']);
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Main HQ',
            'state' => 'Maharashtra',
            'is_head_office' => true,
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    public function test_new_regime_tax_calculation_under_87a_rebate_limit(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 50000,
            'hra' => 25000,
            'conveyance' => 5000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 20000,
            'other_additions' => 0,
            'gross_monthly_salary' => 100000, // Annual Gross = 12,00,000
            'net_take_home_monthly' => 98000,
            'ctc_monthly' => 101950,
            'tds_applicable' => true,
            'tds_regime' => 'new',
        ]);

        // Annual Gross = 12,00,000. Standard Deduction = 75,000. Taxable Income = 11,25,000.
        // Taxable income <= 12,00,000 -> Section 87A rebate applies -> Net Tax = 0.00
        $result = $this->tdsService->calculateAnnualTax($employee, '2026-2027');

        $this->assertEquals('new', $result['regime']);
        $this->assertEquals(1200000.00, $result['annual_gross']);
        $this->assertEquals(75000.00, $result['standard_deduction']);
        $this->assertEquals(1125000.00, $result['taxable_income']);
        $this->assertGreaterThan(0, $result['gross_tax']);
        $this->assertEquals($result['gross_tax'], $result['rebate_87a']);
        $this->assertEquals(0.00, $result['net_tax_payable']);
    }

    public function test_new_regime_tax_calculation_high_earner(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 100000,
            'hra' => 50000,
            'conveyance' => 10000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 40000,
            'other_additions' => 0,
            'gross_monthly_salary' => 200000, // Annual Gross = 24,00,000
            'net_take_home_monthly' => 195000,
            'ctc_monthly' => 201950,
            'tds_applicable' => true,
            'tds_regime' => 'new',
        ]);

        $result = $this->tdsService->calculateAnnualTax($employee, '2026-2027');

        $this->assertEquals('new', $result['regime']);
        $this->assertEquals(2400000.00, $result['annual_gross']);
        $this->assertEquals(2325000.00, $result['taxable_income']);
        $this->assertGreaterThan(100000, $result['total_annual_tax']);
        $this->assertEquals(0.00, $result['rebate_87a']);
    }

    public function test_old_regime_hra_and_80c_exemption_tax_calculation(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 60000,
            'hra' => 30000,
            'conveyance' => 5000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 30000,
            'other_additions' => 0,
            'gross_monthly_salary' => 125000, // Annual Gross = 15,00,000
            'net_take_home_monthly' => 123000,
            'ctc_monthly' => 126950,
            'tds_applicable' => true,
            'tds_regime' => 'old',
        ]);

        $declaration = EmployeeTaxDeclaration::create([
            'employee_id' => $employee->id,
            'financial_year' => '2026-2027',
            'regime' => 'old',
            'ppf_amount' => 100000,
            'elss_amount' => 60000, // Combined 80C = 1.6L -> capped at 1.5L
            'health_insurance_self' => 25000,
            'monthly_rent_paid' => 25000,
            'landlord_name' => 'Sharma House',
            'landlord_pan' => 'ABCDE1234F',
            'is_metro_city' => true,
            'status' => 'verified',
            'verified_by' => $this->admin->id,
            'verified_at' => now(),
        ]);

        $result = $this->tdsService->calculateAnnualTax($employee, '2026-2027', $declaration);

        $this->assertEquals('old', $result['regime']);
        $this->assertEquals(1500000.00, $result['annual_gross']);
        $this->assertEquals(50000.00, $result['standard_deduction']);
        $this->assertGreaterThan(0, $result['hra_exemption']);
        $this->assertEquals(175000.00, $result['chapter_6a_deductions']); // 1.5L 80C + 25k 80D
    }

    public function test_no_verified_declaration_fallback_to_override_or_zero(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 100000,
            'hra' => 50000,
            'conveyance' => 10000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 40000,
            'other_additions' => 0,
            'gross_monthly_salary' => 200000,
            'tds_applicable' => true,
        ]);

        // Unsubmitted / Draft declaration
        EmployeeTaxDeclaration::create([
            'employee_id' => $employee->id,
            'financial_year' => '2026-2027',
            'regime' => 'new',
            'status' => 'draft',
        ]);

        // 1. Without overrides -> returns 0.00 because declaration is NOT verified
        $tds1 = $this->tdsService->calculateMonthlyTds($employee, '2026-07-01', []);
        $this->assertEquals(0.00, $tds1);

        // 2. With admin override -> returns admin override value exactly as before
        $tds2 = $this->tdsService->calculateMonthlyTds($employee, '2026-07-01', ['tds_deduction' => 5500.00]);
        $this->assertEquals(5500.00, $tds2);
    }

    public function test_50_percent_statutory_deduction_cap_holds_with_auto_tds(): void
    {
        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 100000,
            'hra' => 50000,
            'conveyance' => 10000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 40000,
            'other_additions' => 0,
            'gross_monthly_salary' => 200000, // Gross = 2,00,000 -> 50% cap = 1,00,000
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'tds_applicable' => true,
            'tds_regime' => 'new',
        ]);

        // Active verified declaration generating high monthly TDS
        EmployeeTaxDeclaration::create([
            'employee_id' => $employee->id,
            'financial_year' => '2026-2027',
            'regime' => 'new',
            'status' => 'verified',
            'verified_by' => $this->admin->id,
            'verified_at' => now(),
        ]);

        // Seed full month attendance
        for ($day = 1; $day <= 31; $day++) {
            \App\Models\AttendanceRecord::create([
                'employee_id' => $employee->id,
                'attendance_date' => sprintf('2026-07-%02d', $day),
                'status' => 'present',
                'source' => 'live_punch',
            ]);
        }

        $payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'processed_by' => $this->admin->id,
        ]);

        // Override high loan EMI of ₹90,000
        $overrides = [
            'loan_emi_deduction' => 90000.00,
        ];

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun, $overrides);

        $gross = (float)$result['gross_total'];
        $net = (float)$result['net_pay'];

        $totalDeductions = $gross - $net;

        // Verify total deductions NEVER exceed 50% of gross salary (₹1,00,000)
        $this->assertLessThanOrEqual(0.50 * $gross, $totalDeductions);
        $this->assertGreaterThan(0, $result['deferred_loan_amount']);
    }
}
