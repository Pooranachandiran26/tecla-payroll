<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EdliExemptionTest extends TestCase
{
    use RefreshDatabase;

    protected SalaryCalculationService $svc;

    protected function setUp(): void
    {
        parent::setUp();
        $this->svc = new SalaryCalculationService();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Default Client (edli_exempted = false)
    // Confirm ALL THREE components calculate normally:
    // EPF 12% = 1800, EDLI 0.5% = 75, Admin 0.5% = 75, Total = 1950.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_default_client_edli_exempted_false_calculates_all_components()
    {
        $client = Client::factory()->create(['edli_exempted' => false]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $emp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'pf_applicable' => true,
            'pan_number' => 'PANEDLI001',
            'aadhaar_number' => '999900000001',
            'bank_account_number' => '100000000001',
            'uan_mode' => 'existing_transfer'
        ]);

        $calc = $this->svc->calculateStructuralSalary($emp);

        $this->assertEquals(1800.00, round($calc['employer_epf_monthly'] + $calc['employer_eps_monthly'], 2));
        $this->assertEquals(75.00, $calc['edli_monthly']);
        $this->assertEquals(75.00, $calc['epf_admin_monthly']);
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: EDLI Exempted Client (edli_exempted = true)
    // Confirm EDLI = 0, EPF 12% = 1800, Admin = 75, Total = 1875.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_edli_exempted_true_sets_edli_to_zero_keeps_epf_and_admin()
    {
        $client = Client::factory()->create(['edli_exempted' => true]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $emp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'pf_applicable' => true,
            'pan_number' => 'PANEDLI002',
            'aadhaar_number' => '999900000002',
            'bank_account_number' => '100000000002',
            'uan_mode' => 'existing_transfer'
        ]);

        $calc = $this->svc->calculateStructuralSalary($emp);

        $this->assertEquals(1800.00, round($calc['employer_epf_monthly'] + $calc['employer_eps_monthly'], 2));
        $this->assertEquals(0.00, $calc['edli_monthly']);
        $this->assertEquals(75.00, $calc['epf_admin_monthly']);
        $this->assertEquals(1875.00, $calc['employer_pf_monthly']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: 3-Way Split Arithmetic Proof
    // Confirm exact sum matching (1800 + 0 + 75 = 1875 vs 1800 + 75 + 75 = 1950)
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_three_way_split_arithmetic_sum()
    {
        $clientStandard = Client::factory()->create(['edli_exempted' => false]);
        $branchStandard = ClientBranch::factory()->create(['client_id' => $clientStandard->id]);
        $empStandard = Employee::factory()->create([
            'client_id' => $clientStandard->id,
            'branch_id' => $branchStandard->id,
            'basic_pay' => 15000,
            'pan_number' => 'PANEDLI003',
            'aadhaar_number' => '999900000003',
            'bank_account_number' => '100000000003',
            'uan_mode' => 'existing_transfer'
        ]);

        $calcStandard = $this->svc->calculateStructuralSalary($empStandard);
        $sumStandard = $calcStandard['employer_epf_monthly'] + $calcStandard['employer_eps_monthly'] + $calcStandard['edli_monthly'] + $calcStandard['epf_admin_monthly'];
        $this->assertEquals(1950.00, $sumStandard);
        $this->assertEquals($calcStandard['employer_pf_monthly'], $sumStandard);

        $clientExempt = Client::factory()->create(['edli_exempted' => true]);
        $branchExempt = ClientBranch::factory()->create(['client_id' => $clientExempt->id]);
        $empExempt = Employee::factory()->create([
            'client_id' => $clientExempt->id,
            'branch_id' => $branchExempt->id,
            'basic_pay' => 15000,
            'pan_number' => 'PANEDLI004',
            'aadhaar_number' => '999900000004',
            'bank_account_number' => '100000000004',
            'uan_mode' => 'existing_transfer'
        ]);

        $calcExempt = $this->svc->calculateStructuralSalary($empExempt);
        $sumExempt = $calcExempt['employer_epf_monthly'] + $calcExempt['employer_eps_monthly'] + $calcExempt['edli_monthly'] + $calcExempt['epf_admin_monthly'];
        $this->assertEquals(1875.00, $sumExempt);
        $this->assertEquals($calcExempt['employer_pf_monthly'], $sumExempt);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: UI File Label Render Verification
    // Confirm exact strings exist in UI source files
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_ui_pages_contain_three_way_split_labels()
    {
        $employeeDetail = file_get_contents(resource_path('js/Pages/Employees/EmployeeDetail.jsx'));
        $this->assertStringContainsString('Employer EPF Contribution', $employeeDetail);
        $this->assertStringContainsString('EDLI (0.5%)', $employeeDetail);
        $this->assertStringContainsString('EPF Admin Charges (0.5%)', $employeeDetail);

        $employeeForm = file_get_contents(resource_path('js/Pages/Employees/EmployeeForm.jsx'));
        $this->assertStringContainsString('Employer EPF (12%)', $employeeForm);
        $this->assertStringContainsString('EDLI (0.5%)', $employeeForm);
        $this->assertStringContainsString('EPF Admin Charges (0.5%)', $employeeForm);

        $salaryRevision = file_get_contents(resource_path('js/Pages/Employees/SalaryRevision.jsx'));
        $this->assertStringContainsString('Employer EPF', $salaryRevision);
        $this->assertStringContainsString('EDLI (0.5%)', $salaryRevision);
        $this->assertStringContainsString('EPF Admin Charges (0.5%)', $salaryRevision);

        $statutorySection = file_get_contents(resource_path('js/Pages/Clients/sections/StatutorySection.jsx'));
        $this->assertStringContainsString('edliExempted', $statutorySection);
        $this->assertStringContainsString('EDLI Exempted Establishment', $statutorySection);

        $payslip = file_get_contents(resource_path('js/Pages/Payroll/Payslip.jsx'));
        $this->assertStringContainsString('Employer EPF (12%)', $payslip);
        $this->assertStringContainsString('EDLI (0.5%)', $payslip);
        $this->assertStringContainsString('EPF Admin Charges (0.5%)', $payslip);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: Canonical PF Baseline Check (TEC-088)
    // Confirm canonical employee gets exactly 1950.00
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_canonical_pf_baseline_holds_1950()
    {
        $client = Client::factory()->create(['edli_exempted' => false]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $emp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'TEC-088',
            'basic_pay' => 15000,
            'pf_applicable' => true,
            'pan_number' => 'PANTEC088A',
            'aadhaar_number' => '999900000088',
            'bank_account_number' => '100000000088',
            'uan_mode' => 'existing_transfer'
        ]);

        $calc = $this->svc->calculateStructuralSalary($emp);
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }
}
