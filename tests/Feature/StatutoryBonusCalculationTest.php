<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\SalaryCalculationService;

class StatutoryBonusCalculationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_employee_basic_15000_calculated_on_7000_ceiling()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
        ]); // Basic = 15,000 (<= 21,000 threshold, > 7,000 ceiling)

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        // Expected: min(15000, 7000) * 8.33% = 7000 * 0.0833 = 583.10
        $this->assertEquals(583.10, $calc['bonus_accrual_monthly']);
    }

    /** @test */
    public function test_employee_basic_25000_above_eligibility_threshold_gets_zero_bonus()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 25000,
            'hra' => 10000,
        ]); // Basic = 25,000 (> 21,000 threshold -> EXEMPT)

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        $this->assertEquals(0.00, $calc['bonus_accrual_monthly']);
    }

    /** @test */
    public function test_employee_basic_5000_below_ceiling_calculated_on_full_basic()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 5000,
            'hra' => 3000,
        ]); // Basic = 5,000 (<= 7,000 ceiling -> uses full 5,000)

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        // Expected: min(5000, 7000) * 8.33% = 5000 * 0.0833 = 416.50
        $this->assertEquals(416.50, $calc['bonus_accrual_monthly']);
    }

    /** @test */
    public function test_employee_basic_exactly_21000_boundary_is_eligible()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 21000,
            'hra' => 9000,
        ]); // Basic = EXACTLY 21,000 (<= 21,000 boundary -> ELIGIBLE)

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        // Expected: min(21000, 7000) * 8.33% = 7000 * 0.0833 = 583.10
        $this->assertEquals(583.10, $calc['bonus_accrual_monthly']);
    }

    /** @test */
    public function test_bonus_rate_range_minimum_8_33_and_maximum_20_percent()
    {
        // 8.33% (Min)
        $clientMin = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branchMin = ClientBranch::factory()->create(['client_id' => $clientMin->id]);
        $empMin = Employee::factory()->create([
            'client_id' => $clientMin->id,
            'branch_id' => $branchMin->id,
            'basic_pay' => 15000,
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '111122223333',
            'bank_account_number' => '100000000001',
        ]);

        // 20.00% (Max)
        $clientMax = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 20.00,
        ]);
        $branchMax = ClientBranch::factory()->create(['client_id' => $clientMax->id]);
        $empMax = Employee::factory()->create([
            'client_id' => $clientMax->id,
            'branch_id' => $branchMax->id,
            'basic_pay' => 15000,
            'pan_number' => 'ABCDE2222B',
            'aadhaar_number' => '111122224444',
            'bank_account_number' => '100000000002',
        ]);

        $svc = new SalaryCalculationService();
        $calcMin = $svc->calculateStructuralSalary($empMin);
        $calcMax = $svc->calculateStructuralSalary($empMax);

        // 7000 * 8.33% = 583.10
        $this->assertEquals(583.10, $calcMin['bonus_accrual_monthly']);

        // 7000 * 20.00% = 1400.00
        $this->assertEquals(1400.00, $calcMax['bonus_accrual_monthly']);
    }

    /** @test */
    public function test_bonus_disabled_on_client_returns_zero_bonus()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => false,
            'bonus_rate_percentage' => 8.33,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
        ]);

        $svc = new SalaryCalculationService();
        $calc = $svc->calculateStructuralSalary($employee);

        $this->assertEquals(0.00, $calc['bonus_accrual_monthly']);
    }
}
