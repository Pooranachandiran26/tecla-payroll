<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Client;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StatutoryBonusTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_statutory_bonus_ctc_accrual_mode_keeps_gross_unchanged_and_accrues_in_ctc()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
            'statutory_bonus_type' => 'ctc_accrual',
            'gratuity_applicable' => false,
        ]);

        $calculator = new SalaryCalculationService();
        $calc = $calculator->calculateStructuralSalary([
            'client_id' => $client->id,
            'basic_pay' => 12125,
            'hra' => 6062,
            'other_additions' => 2021,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
        ]);

        // Base gross: 12125 + 6062 + 2021 = 20208
        $this->assertEquals(20208.00, $calc['gross_monthly_salary']);
        $this->assertEquals(583.10, $calc['bonus_accrual_monthly']); // min(12125, 7000) * 8.33% = 583.10
        $this->assertEquals(0.00, $calc['statutory_bonus_monthly']);
        $this->assertEquals(20791.10, $calc['ctc_monthly']); // 20208 + 583.10
    }

    public function test_statutory_bonus_part_of_gross_mode_adds_bonus_to_monthly_gross_earnings()
    {
        $client = Client::factory()->create([
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
            'statutory_bonus_type' => 'part_of_gross',
            'gratuity_applicable' => false,
        ]);

        $calculator = new SalaryCalculationService();
        $calc = $calculator->calculateStructuralSalary([
            'client_id' => $client->id,
            'basic_pay' => 12125,
            'hra' => 6062,
            'other_additions' => 1011,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
        ]);

        // Base earnings: 12125 + 6062 + 1011 = 19198
        // Bonus (8.33% of 7000 = 583.10) added to gross pay
        // Expected gross = 19198 + 583.10 = 19781.10
        $this->assertEquals(583.10, $calc['statutory_bonus_monthly']);
        $this->assertEquals(19781.10, $calc['gross_monthly_salary']);
        $this->assertEquals(19781.10, $calc['ctc_monthly']); // Gross already includes bonus, no double counting
    }
}
