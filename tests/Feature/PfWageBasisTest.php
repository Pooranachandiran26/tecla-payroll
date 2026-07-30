<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use App\Services\SalaryCalculationService;

class PfWageBasisTest extends TestCase
{
    use RefreshDatabase;

    protected SalaryCalculationService $salaryService;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->salaryService = new SalaryCalculationService();
        $this->client = Client::factory()->create([
            'status' => 'active',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'pf_ceiling' => 15000,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ]);
    }

    /** @test */
    public function test_1_default_ceiling_ceiling_produces_canonical_1950_employer_cost()
    {
        $input = [
            'client_id' => $this->client->id,
            'basic_pay' => 25000,
            'hra' => 5000,
            'da' => 0,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
        ];

        $calc = $this->salaryService->calculateStructuralSalary($input);

        $this->assertEquals(1800.00, $calc['employee_pf_monthly']);
        $this->assertEquals(1249.50, $calc['employer_eps_monthly']);
        $this->assertEquals(550.50, $calc['employer_epf_monthly']);
        $this->assertEquals(75.00, $calc['edli_monthly']);
        $this->assertEquals(75.00, $calc['epf_admin_monthly']);
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    /** @test */
    public function test_2_all_4_wage_basis_combinations_match_verified_specs()
    {
        $employeeData = [
            'client_id' => $this->client->id,
            'basic_pay' => 25000,
            'da' => 2000, // Basic + DA = 27,000
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
        ];

        // 1. Ceiling / Ceiling
        $calc1 = $this->salaryService->calculateStructuralSalary(array_merge($employeeData, [
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ]));
        $this->assertEquals(1800.00, $calc1['employee_pf_monthly']);
        $this->assertEquals(550.50, $calc1['employer_epf_monthly']);
        $this->assertEquals(1249.50, $calc1['employer_eps_monthly']);
        $this->assertEquals(75.00, $calc1['edli_monthly']);
        $this->assertEquals(75.00, $calc1['epf_admin_monthly']);
        $this->assertEquals(1950.00, $calc1['employer_pf_monthly']);

        // 2. Actual / Actual (27,000 Basic+DA)
        $calc2 = $this->salaryService->calculateStructuralSalary(array_merge($employeeData, [
            'employee_pf_wage_basis' => 'actual_basic_da',
            'employer_pf_wage_basis' => 'actual_basic_da',
        ]));
        $this->assertEquals(3240.00, $calc2['employee_pf_monthly']); // 12% * 27000
        $this->assertEquals(1249.50, $calc2['employer_eps_monthly']); // Capped at 15k
        $this->assertEquals(1990.50, $calc2['employer_epf_monthly']); // 3240 - 1249.50
        $this->assertEquals(75.00, $calc2['edli_monthly']); // Capped at 15k
        $this->assertEquals(75.00, $calc2['epf_admin_monthly']); // Capped at 15k
        $this->assertEquals(3390.00, $calc2['employer_pf_monthly']); // 3240 + 75 + 75 = 3390.00

        // 3. Actual / Ceiling
        $calc3 = $this->salaryService->calculateStructuralSalary(array_merge($employeeData, [
            'employee_pf_wage_basis' => 'actual_basic_da',
            'employer_pf_wage_basis' => 'ceiling',
        ]));
        $this->assertEquals(3240.00, $calc3['employee_pf_monthly']);
        $this->assertEquals(550.50, $calc3['employer_epf_monthly']);
        $this->assertEquals(1249.50, $calc3['employer_eps_monthly']);
        $this->assertEquals(75.00, $calc3['edli_monthly']);
        $this->assertEquals(75.00, $calc3['epf_admin_monthly']);
        $this->assertEquals(1950.00, $calc3['employer_pf_monthly']);

        // 4. Ceiling / Actual
        $calc4 = $this->salaryService->calculateStructuralSalary(array_merge($employeeData, [
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'actual_basic_da',
        ]));
        $this->assertEquals(1800.00, $calc4['employee_pf_monthly']);
        $this->assertEquals(1990.50, $calc4['employer_epf_monthly']);
        $this->assertEquals(1249.50, $calc4['employer_eps_monthly']);
        $this->assertEquals(75.00, $calc4['edli_monthly']);
        $this->assertEquals(75.00, $calc4['epf_admin_monthly']);
        $this->assertEquals(3390.00, $calc4['employer_pf_monthly']);
    }

    /** @test */
    public function test_3_eps_edli_admin_remain_capped_in_all_4_combinations()
    {
        $employeeData = [
            'client_id' => $this->client->id,
            'basic_pay' => 40000,
            'da' => 10000, // Basic + DA = 50,000
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
        ];

        $combinations = [
            ['ceiling', 'ceiling'],
            ['actual_basic_da', 'actual_basic_da'],
            ['actual_basic_da', 'ceiling'],
            ['ceiling', 'actual_basic_da'],
        ];

        foreach ($combinations as [$empBasis, $emprBasis]) {
            $calc = $this->salaryService->calculateStructuralSalary(array_merge($employeeData, [
                'employee_pf_wage_basis' => $empBasis,
                'employer_pf_wage_basis' => $emprBasis,
            ]));

            $this->assertEquals(1249.50, $calc['employer_eps_monthly'], "EPS capped at 1249.50 for {$empBasis}/{$emprBasis}");
            $this->assertEquals(75.00, $calc['edli_monthly'], "EDLI capped at 75.00 for {$empBasis}/{$emprBasis}");
            $this->assertEquals(75.00, $calc['epf_admin_monthly'], "Admin capped at 75.00 for {$empBasis}/{$emprBasis}");
        }
    }

    /** @test */
    public function test_4_joint_declaration_guard_blocks_actual_basic_da_without_attestation()
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $clientWithActual = Client::factory()->create([
            'status' => 'active',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'employee_pf_wage_basis' => 'actual_basic_da',
            'employer_pf_wage_basis' => 'actual_basic_da',
        ]);

        $payload = [
            'clientPartner' => $clientWithActual->id,
            'first_name' => 'Rahul',
            'last_name' => 'Sharma',
            'father_name' => 'Vikram Sharma',
            'personalEmail' => 'rahul.sharma@example.com',
            'phone' => '9876543210',
            'dob' => '1995-05-15',
            'doj' => '2026-01-01',
            'designation' => 'Senior Developer',
            'empType' => 'agency_contract',
            'priorEmploymentFlag' => true,
            'address' => '123 Main St, Bangalore',
            'accountNo' => '123456789012',
            'ifsc' => 'HDFC0000060',
            'accountHolder' => 'Rahul Sharma',
            'pan' => 'ABCDE1234F',
            'basicSal' => 20000,
            'hraSal' => 5000,
            'conveyanceSal' => 0,
            'daSal' => 2000, // Basic + DA = 22,000 > 15,000
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'pfToggle' => true,
            'epsToggle' => true,
            'esiToggle' => false,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => false,
            'bonusToggle' => false,
            'taxRegime' => 'new',
            'declarations' => 'yes',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '30',
            'joint_declaration_status' => 'not_required', // Missing attestation!
        ];

        $response = $this->actingAs($admin)
            ->post(route('employees.store'), $payload);

        $response->assertSessionHasErrors(['joint_declaration_status']);
    }

    /** @test */
    public function test_5_da_is_included_in_basic_da_pf_wage_base()
    {
        $calcWithoutDa = $this->salaryService->calculateStructuralSalary([
            'client_id' => $this->client->id,
            'basic_pay' => 10000,
            'da' => 0,
            'pf_applicable' => true,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ]);

        $calcWithDa = $this->salaryService->calculateStructuralSalary([
            'client_id' => $this->client->id,
            'basic_pay' => 10000,
            'da' => 4000, // Basic + DA = 14,000
            'pf_applicable' => true,
            'employee_pf_wage_basis' => 'ceiling',
            'employer_pf_wage_basis' => 'ceiling',
        ]);

        $this->assertEquals(1200.00, $calcWithoutDa['employee_pf_monthly']); // 12% * 10000
        $this->assertEquals(1680.00, $calcWithDa['employee_pf_monthly']);    // 12% * 14000
    }

    /** @test */
    public function test_6_monthly_payroll_calculator_uses_client_wage_basis_when_employee_override_is_null()
    {
        $clientActualEmp = Client::factory()->create([
            'status' => 'active',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'pf_ceiling' => 15000,
            'employee_pf_wage_basis' => 'actual_basic_da',
            'employer_pf_wage_basis' => 'ceiling',
        ]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $clientActualEmp->id]);
        $emp = Employee::factory()->create([
            'client_id' => $clientActualEmp->id,
            'branch_id' => $branch->id,
            'basic_pay' => 22000,
            'da' => 0,
            'special_allowance' => 10400,
            'lop_basis_days' => 30,
            'date_of_joining' => '2023-01-01',
            'attendance_tracking_start_date' => '2023-01-01',
            'pf_applicable' => true,
            'employee_pf_wage_basis' => null, // Inherits client's actual_basic_da
            'employer_pf_wage_basis' => null, // Inherits client's ceiling
            'pan_number' => 'PANKRATOZ1',
            'aadhaar_number' => '999900000507',
            'bank_account_number' => '100000000507',
            'uan_mode' => 'existing_transfer',
        ]);

        \Illuminate\Support\Facades\DB::table('attendance_records')->insert(
            array_map(fn($day) => [
                'employee_id' => $emp->id,
                'attendance_date' => sprintf('2026-08-%02d', $day),
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ], range(1, 31))
        );

        $payrollRun = \App\Models\PayrollRun::create([
            'client_id' => $clientActualEmp->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        $monthlyCalc = app(\App\Services\MonthlyPayrollCalculator::class);
        $res = $monthlyCalc->calculateForEmployee($emp, $payrollRun);

        // Employee PF = 12% of 22,000 = 2,640.00
        $this->assertEquals(2640.00, (float)$res['employee_pf']);
        // Employer EPF + EDLI + Admin = 1,800 + 75 + 75 = 1,950.00
        $this->assertEquals(1950.00, (float)$res['employer_pf']);
        // Net Pay = 45,000 - 2,640 - 208.33 = 42,151.67
        $this->assertEquals(round($res['gross_total'] - $res['employee_pf'] - $res['professional_tax'] - $res['tds_deduction'] - $res['employee_esi'] - $res['lwf_deduction'], 2), round((float)$res['net_pay'], 2));
    }
}
