<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\User;
use App\Services\PayrollCorrectionService;
use App\Services\SalaryCalculationService;
use Database\Seeders\PtSlabSeeder;

class EpsSplitPropagationCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-08-01'));
        $this->seed(PtSlabSeeder::class);
    }

    private function createParentRun(Client $client, string $month = '2026-07-01'): PayrollRun
    {
        return PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000.00,
            'total_net_disbursement' => 18000.00,
            'total_employer_statutory_cost' => 1950.00,
        ]);
    }

    private function createRunItemAndLock(PayrollRun $run, Employee $employee): PayrollRunItem
    {
        $item = PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 20000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 18000,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ]);

        \Illuminate\Support\Facades\DB::table('payroll_runs')->where('id', $run->id)->update(['status' => 'locked']);
        $run->refresh();

        return $item;
    }

    /** @test */
    public function test_1_correction_preview_for_eps_excluded_employee_returns_full_12_percent_epf_and_zero_eps()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'gross_monthly_salary' => 20000,
            'pf_applicable' => true,
            'eps_applicable' => false, // Explicitly EPS Excluded!
            'date_of_birth' => '1990-01-01',
        ]);

        $parentRun = $this->createParentRun($client);
        $this->createRunItemAndLock($parentRun, $employee);

        $correctionService = app(PayrollCorrectionService::class);
        $preview = $correctionService->calculateCorrectionPreview($employee, $parentRun, 30.0, 0.0);

        $salaryService = app(SalaryCalculationService::class);
        $calcData = array_merge($preview['corrected'], [
            'client_id' => $employee->client_id,
            'pf_applicable' => true,
            'eps_applicable' => false,
            'date_of_birth' => $employee->date_of_birth,
        ]);
        $calc = $salaryService->calculateStructuralSalary($calcData);

        // EPF = 1800.00 (Full 12%), EPS = 0.00
        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);
        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        // Total Employer PF & EPFO Charges (EPF + EPS + EDLI + Admin) = 1800 + 0 + 75 + 75 = 1950.00
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    /** @test */
    public function test_2_correction_preview_for_age_58_plus_employee_returns_full_12_percent_epf_and_zero_eps()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);

        // Employee born in 1965 (Age 61 in 2026 -> Age 58+ cutoff reached!)
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'gross_monthly_salary' => 20000,
            'pf_applicable' => true,
            'eps_applicable' => true, // eps_applicable is true, BUT age >= 58
            'date_of_birth' => '1965-01-01',
        ]);

        $parentRun = $this->createParentRun($client);
        $this->createRunItemAndLock($parentRun, $employee);

        $correctionService = app(PayrollCorrectionService::class);
        $preview = $correctionService->calculateCorrectionPreview($employee, $parentRun, 30.0, 0.0);

        $salaryService = app(SalaryCalculationService::class);
        $calcData = array_merge($preview['corrected'], [
            'client_id' => $employee->client_id,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => $employee->date_of_birth,
            'payroll_month' => '2026-07-01',
        ]);
        $calc = $salaryService->calculateStructuralSalary($calcData);

        // EPF = 1800.00 (Full 12%), EPS = 0.00 (Cutoff reached)
        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);
        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    /** @test */
    public function test_3_salary_revision_preview_and_store_consistent_for_eps_excluded_employee()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'gross_monthly_salary' => 20000,
            'pf_applicable' => true,
            'eps_applicable' => false, // EPS Excluded
            'date_of_birth' => '1990-01-01',
        ]);

        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($admin)->post(route('employees.salary-revision.store', $employee->id), [
            'new_basic_pay' => 20000,
            'new_hra' => 5000,
            'new_conveyance' => 0,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'effective_date' => now()->toDateString(),
            'reason_for_revision' => 'appraisal',
        ]);

        $response->assertRedirect();

        $revision = \App\Models\SalaryRevision::where('employee_id', $employee->id)->first();
        $this->assertNotNull($revision);

        // Calculate expected structural salary for new basic 20000 with eps_applicable = false
        $salaryService = app(SalaryCalculationService::class);
        $calc = $salaryService->calculateStructuralSalary([
            'client_id' => $employee->client_id,
            'pf_applicable' => true,
            'eps_applicable' => false,
            'date_of_birth' => $employee->date_of_birth,
            'basic_pay' => 20000,
            'hra' => 5000,
        ]);

        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);
        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        $this->assertEquals($calc['net_take_home_monthly'], $revision->new_net_take_home);
        $this->assertEquals($calc['ctc_monthly'], $revision->new_ctc);
    }

    /** @test */
    public function test_4_regression_normal_eps_eligible_employee_maintains_standard_3_67_and_8_33_split()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'gross_monthly_salary' => 20000,
            'pf_applicable' => true,
            'eps_applicable' => true, // Normal eligible employee under 58
            'date_of_birth' => '1990-01-01',
        ]);

        $parentRun = $this->createParentRun($client);
        $this->createRunItemAndLock($parentRun, $employee);

        $correctionService = app(PayrollCorrectionService::class);
        $preview = $correctionService->calculateCorrectionPreview($employee, $parentRun, 30.0, 0.0);

        $salaryService = app(SalaryCalculationService::class);
        $calcData = array_merge($preview['corrected'], [
            'client_id' => $employee->client_id,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => $employee->date_of_birth,
            'payroll_month' => '2026-07-01',
        ]);
        $calc = $salaryService->calculateStructuralSalary($calcData);

        // Standard split: EPF = 550.50 (3.67%), EPS = 1249.50 (8.33%)
        $this->assertEquals(550.50, $calc['employer_epf_monthly']);
        $this->assertEquals(1249.50, $calc['employer_eps_monthly']);

        // Canonical Employer PF check: EPF (550.50) + EPS (1249.50) + EDLI (75.00) + Admin (75.00) = 1950.00
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }
}
