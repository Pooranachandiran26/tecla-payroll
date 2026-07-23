<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanRepayment;
use App\Models\EmployeeTaxDeclaration;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\FullAndFinalCalculationService;
use App\Services\MonthlyPayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeLoanManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Client $client;
    protected ClientBranch $branch;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Loan Test Corp',
            'contract_type' => 'agency',
            'registered_state' => 'Maharashtra',
            'status' => 'active',
        ]);

        $this->branch = ClientBranch::factory()->create([
            'client_id' => $this->client->id,
            'state' => 'Maharashtra',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Rajesh Kumar',
            'employee_code' => 'TEC-999',
            'date_of_joining' => '2023-01-01',
            'basic_pay' => 40000,
            'hra' => 20000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'status' => 'active',
            'lop_basis_days' => '30',
        ]);
    }

    public function test_admin_can_issue_salary_advance_and_company_loan()
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('employees.loans.store', $this->employee->id), [
                'loan_type' => 'company_loan',
                'principal_amount' => 30000,
                'monthly_emi' => 5000,
                'start_date' => '2026-07-01',
                'reason' => 'Medical advance',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('employee_loans', [
            'employee_id' => $this->employee->id,
            'loan_type' => 'company_loan',
            'principal_amount' => 30000,
            'monthly_emi' => 5000,
            'remaining_balance' => 30000,
            'status' => 'active',
        ]);
    }

    public function test_manual_emi_override_takes_priority_over_autocalculated_loan_emi()
    {
        EmployeeLoan::create([
            'employee_id' => $this->employee->id,
            'loan_number' => 'LN-2026-0001',
            'loan_type' => 'company_loan',
            'principal_amount' => 30000,
            'monthly_emi' => 5000,
            'total_repaid' => 0,
            'remaining_balance' => 30000,
            'start_date' => '2026-07-01',
            'status' => 'active',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);

        // 1. Without override -> auto-calculates active loan EMI of 5000
        $resultAuto = $calculator->calculateForEmployee($this->employee, $payrollRun, []);
        $this->assertEquals(5000, $resultAuto['loan_emi_deduction']);

        // 2. With explicit manual override of 2500 -> manual override takes priority
        $resultManual = $calculator->calculateForEmployee($this->employee, $payrollRun, ['loan_emi_deduction' => 2500]);
        $this->assertEquals(2500, $resultManual['loan_emi_deduction']);
    }

    public function test_idempotency_on_parent_and_supplementary_run_lock()
    {
        $loan = EmployeeLoan::create([
            'employee_id' => $this->employee->id,
            'loan_number' => 'LN-2026-0002',
            'loan_type' => 'company_loan',
            'principal_amount' => 20000,
            'monthly_emi' => 4000,
            'total_repaid' => 0,
            'remaining_balance' => 20000,
            'start_date' => '2026-07-01',
            'status' => 'active',
        ]);

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'approved',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 60000,
            'total_net_disbursement' => 54000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($this->employee, $parentRun);

        // Lock parent run -> balance should reduce by 4000 (to 16000)
        $this->actingAs($this->adminUser)->post("/payroll/{$parentRun->id}/lock");

        $loan->refresh();
        $this->assertEquals(4000, $loan->total_repaid);
        $this->assertEquals(16000, $loan->remaining_balance);

        // Supplementary run for the same period
        $suppRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'approved',
            'is_supplementary_run' => true,
            'parent_run_id' => $parentRun->id,
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 60000,
            'total_net_disbursement' => 54000,
            'total_employer_statutory_cost' => 1950,
        ]);

        // Lock supplementary run -> balance MUST NOT be double-reduced!
        $this->actingAs($this->adminUser)->post("/payroll/{$suppRun->id}/lock");

        $loan->refresh();
        $this->assertEquals(4000, $loan->total_repaid);
        $this->assertEquals(16000, $loan->remaining_balance);
        $this->assertEquals(1, EmployeeLoanRepayment::count());
    }

    public function test_combined_autotds_and_autoloan_50_percent_cap()
    {
        // Enable TDS for employee
        $this->employee->update([
            'tds_applicable' => true,
            'basic_pay' => 100000,
            'hra' => 50000,
        ]);

        // Verified Tax Declaration causing high Auto-TDS under New Regime
        EmployeeTaxDeclaration::create([
            'employee_id' => $this->employee->id,
            'financial_year' => '2026-2027',
            'regime' => 'new',
            'status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $this->adminUser->id,
        ]);

        // Active Loan with EMI of ₹80,000
        EmployeeLoan::create([
            'employee_id' => $this->employee->id,
            'loan_number' => 'LN-2026-0003',
            'loan_type' => 'company_loan',
            'principal_amount' => 200000,
            'monthly_emi' => 80000,
            'total_repaid' => 0,
            'remaining_balance' => 200000,
            'start_date' => '2026-07-01',
            'status' => 'active',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($this->employee, $payrollRun);

        // Statutory & Tax (PF + PT + Auto TDS) should NOT be capped, Loan EMI is deferred first
        $this->assertGreaterThan(0, $result['tds_deduction']);
        $this->assertGreaterThan(0, $result['employee_pf']);
        $this->assertGreaterThan(0, $result['loan_emi_deduction']);
        $this->assertGreaterThan(0, $result['deferred_loan_amount']);
        $totalDeducted = round($result['employee_pf'] + $result['employee_esi'] + $result['professional_tax'] + $result['lwf_deduction'] + $result['tds_deduction'] + $result['loan_emi_deduction'], 2);
        $this->assertEquals($result['gross_total'] * 0.5, $totalDeducted);
    }

    public function test_full_and_final_settlement_prefills_remaining_loan_balance()
    {
        EmployeeLoan::create([
            'employee_id' => $this->employee->id,
            'loan_number' => 'LN-2026-0004',
            'loan_type' => 'company_loan',
            'principal_amount' => 15000,
            'monthly_emi' => 3000,
            'total_repaid' => 3000,
            'remaining_balance' => 12000,
            'start_date' => '2026-06-01',
            'status' => 'active',
        ]);

        $service = app(FullAndFinalCalculationService::class);
        $result = $service->calculatePreview($this->employee, []);

        // Auto-fetches remaining balance of 12000 for exit settlement
        $this->assertEquals(12000, $result['loan_recovery_amount']);
    }
}
