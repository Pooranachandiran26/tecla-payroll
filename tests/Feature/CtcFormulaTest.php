<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\SalaryCalculationService;
use Illuminate\Support\Facades\DB;

class CtcFormulaTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_ctc_includes_gratuity_when_applicable_and_part_of_ctc()
    {
        $client = Client::factory()->create(['gratuity_applicable' => true]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 25000,
            'hra' => 15000,
            'gratuity_mode' => 'part_of_ctc',
            'pf_applicable' => true,
            'esi_applicable' => false,
        ]); // Basic = 25,000, Gross = 40,000

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        $gross = 40000.00;
        $employerPf = 15000 * 0.13; // 1950.00
        $gratuityAccrual = round(25000 * (15 / 26 / 12), 2); // 1201.92
        $expectedCtc = round($gross + $employerPf + $gratuityAccrual, 2);

        $this->assertEquals(1201.92, $calc['gratuity_accrual_monthly']);
        $this->assertEquals($expectedCtc, $calc['ctc_monthly']);
    }

    /** @test */
    public function test_ctc_gratuity_accrual_uses_basic_plus_da_combined()
    {
        $client = Client::factory()->create(['gratuity_applicable' => true]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 9000,
            'da' => 1000,
            'gratuity_mode' => 'part_of_ctc',
        ]);

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        // (9000 + 1000) * (15 / 26 / 12) = 480.77
        $this->assertEquals(480.77, $calc['gratuity_accrual_monthly']);
    }

    /** @test */
    public function test_ctc_excludes_gratuity_when_client_default_mode_is_na()
    {
        $client = Client::factory()->create(['gratuity_applicable' => true, 'default_gratuity_mode' => 'na']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employeeData = [
            'client_id' => $client->id,
            'basic_pay' => 25000,
            'hra' => 15000,
            'gratuity_mode' => 'na', // Client default mode 'na'
            'gratuity_applicable' => true,
        ];

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employeeData);

        $this->assertEquals(0.00, $calc['gratuity_accrual_monthly']);
    }

    /** @test */
    public function test_ctc_excludes_gratuity_when_mode_is_over_and_above()
    {
        $client = Client::factory()->create(['gratuity_applicable' => true]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 25000,
            'hra' => 15000,
            'gratuity_mode' => 'over_and_above',
            'pf_applicable' => true,
            'esi_applicable' => false,
        ]); // Basic = 25,000, Gross = 40,000

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        $gross = 40000.00;
        $employerPf = 15000 * 0.13; // 1950.00
        $expectedCtc = round($gross + $employerPf, 2); // Excludes gratuity

        $this->assertEquals(0.00, $calc['gratuity_accrual_monthly']);
        $this->assertEquals($expectedCtc, $calc['ctc_monthly']);
    }

    /** @test */
    public function test_ctc_includes_statutory_bonus_when_enabled_on_client()
    {
        $client = Client::factory()->create([
            'gratuity_applicable' => false,
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 20000,
            'hra' => 10000,
            'pf_applicable' => true,
            'esi_applicable' => false,
        ]); // Basic = 20,000, Gross = 30,000

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        $bonusAccrual = round(min(20000, 7000) * 0.0833, 2); // 583.10
        $this->assertEquals(583.10, $calc['bonus_accrual_monthly']);
    }

    /** @test */
    public function test_locked_payroll_runs_have_zero_retroactive_impact()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $run = PayrollRun::create(['client_id' => $client->id, 'status' => 'locked', 'payroll_month' => '2026-07-01']);
        $employee = Employee::factory()->create(['client_id' => $client->id, 'branch_id' => $branch->id]);

        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 20000,
            'hra' => 10000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 40000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 38200,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $itemBefore = DB::table('payroll_run_items')->where('payroll_run_id', $run->id)->first();
        
        // Re-run service
        $svc = new SalaryCalculationService();
        $svc->calculateStructuralSalary($employee);

        $itemAfter = DB::table('payroll_run_items')->where('payroll_run_id', $run->id)->first();

        $this->assertEquals($itemBefore->net_pay, $itemAfter->net_pay);
        $this->assertEquals($itemBefore->gross_total, $itemAfter->gross_total);
        $this->assertEquals(1950, $itemAfter->employer_pf);
    }
}
