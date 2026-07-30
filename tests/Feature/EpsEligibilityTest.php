<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Services\SalaryCalculationService;
use Carbon\Carbon;

class EpsEligibilityTest extends TestCase
{
    /**
     * Test 1: eps_applicable = true, age < 58.
     * Expect exact penny-precise split:
     * - Capped Base = ₹15,000.00
     * - EPS (8.33%) = round(15000 * 0.0833, 2) = 1249.50
     * - EPF (3.67%) = 1800.00 - 1249.50 = 550.50
     * - Total Employer EPF + EPS = 1800.00 (12%)
     * - Total Employer PF (inc. Admin/EDLI) = 1950.00 (13%)
     */
    public function test_eps_applicable_true_under_58_calculates_standard_split(): void
    {
        $service = app(SalaryCalculationService::class);
        $data = [
            'basic_pay' => 15000.00,
            'date_of_birth' => '1990-01-01', // Age ~36
            'payroll_month' => '2026-07-01',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'edli_exempted' => false,
        ];

        $calc = $service->calculateStructuralSalary($data);

        $this->assertEquals(1249.50, $calc['employer_eps_monthly']);
        $this->assertEquals(550.50, $calc['employer_epf_monthly']);
        $this->assertEquals(1800.00, round($calc['employer_eps_monthly'] + $calc['employer_epf_monthly'], 2));
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    /**
     * Test 2: eps_applicable = false, age < 58.
     * Expect:
     * - EPS = 0.00
     * - EPF = 1800.00 (Full 12%)
     * - Total Employer EPF + EPS = 1800.00
     * - Total Employer PF (inc. Admin/EDLI) = 1950.00
     */
    public function test_eps_applicable_false_under_58_allocates_full_twelve_percent_to_epf(): void
    {
        $service = app(SalaryCalculationService::class);
        $data = [
            'basic_pay' => 15000.00,
            'date_of_birth' => '1990-01-01', // Age ~36
            'payroll_month' => '2026-07-01',
            'pf_applicable' => true,
            'eps_applicable' => false, // High wage post-Sept 2014 entrant
            'edli_exempted' => false,
        ];

        $calc = $service->calculateStructuralSalary($data);

        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);
        $this->assertEquals(1800.00, round($calc['employer_eps_monthly'] + $calc['employer_epf_monthly'], 2));
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    /**
     * Test 3: eps_applicable = true, age >= 58.
     * Expect automatic age 58 cutoff:
     * - EPS = 0.00
     * - EPF = 1800.00 (Full 12%)
     * - Total Employer EPF + EPS = 1800.00
     * - Total Employer PF (inc. Admin/EDLI) = 1950.00
     */
    public function test_eps_applicable_true_over_58_automatically_cuts_off_eps(): void
    {
        $service = app(SalaryCalculationService::class);
        $data = [
            'basic_pay' => 15000.00,
            'date_of_birth' => '1965-01-01', // Age 61 (>= 58)
            'payroll_month' => '2026-07-01',
            'pf_applicable' => true,
            'eps_applicable' => true, // Flag is true, but age >= 58 forces cutoff
            'edli_exempted' => false,
        ];

        $calc = $service->calculateStructuralSalary($data);

        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);
        $this->assertEquals(1800.00, round($calc['employer_eps_monthly'] + $calc['employer_epf_monthly'], 2));
        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
    }

    /**
     * Test 4: Regression test — Total Employer Statutory PF cost (₹1,950.00)
     * including EDLI (0.5% = ₹75.00) & Admin (0.5% = ₹75.00) is invariant
     * across all 3 scenarios.
     */
    public function test_canonical_employer_pf_total_is_invariant_across_all_scenarios(): void
    {
        $service = app(SalaryCalculationService::class);

        $scenarios = [
            'standard_eligible' => ['eps_applicable' => true, 'date_of_birth' => '1990-01-01'],
            'eps_excluded'     => ['eps_applicable' => false, 'date_of_birth' => '1990-01-01'],
            'age_58_cutoff'    => ['eps_applicable' => true, 'date_of_birth' => '1965-01-01'],
        ];

        foreach ($scenarios as $name => $override) {
            $data = array_merge([
                'basic_pay' => 15000.00,
                'payroll_month' => '2026-07-01',
                'pf_applicable' => true,
                'edli_exempted' => false,
            ], $override);

            $calc = $service->calculateStructuralSalary($data);

            $this->assertEquals(1950.00, $calc['employer_pf_monthly'], "Scenario {$name} employer_pf_monthly mismatch");
            $this->assertEquals(75.00, $calc['edli_monthly'], "Scenario {$name} edli_monthly mismatch");
            $this->assertEquals(75.00, $calc['epf_admin_monthly'], "Scenario {$name} epf_admin_monthly mismatch");

            // Total 12% contribution (EPF + EPS) is always 1800.00
            $total12Pct = $calc['employer_epf_monthly'] + $calc['employer_eps_monthly'];
            $this->assertEquals(1800.00, round($total12Pct, 2), "Scenario {$name} 12% total mismatch");

            // Total Statutory PF Cost = Employer EPF + EPS (1800) + EDLI (75) + Admin (75) = 1950.00
            $totalStatutoryPfCost = $calc['employer_epf_monthly'] + $calc['employer_eps_monthly'] + $calc['edli_monthly'] + $calc['epf_admin_monthly'];
            $this->assertEquals(1950.00, round($totalStatutoryPfCost, 2), "Scenario {$name} total statutory PF cost mismatch");
        }
    }

    /**
     * Test 5: Dual Toggle Combination Test — eps_applicable = false AND edli_exempted = true
     * Confirm exact composition:
     * - EPF (12%) = 1800.00
     * - EPS (8.33%) = 0.00
     * - EDLI (0.5%) = 0.00 (exempted)
     * - EPF Admin (0.5%) = 75.00
     * - Total Employer PF Statutory Cost = 1800 + 0 + 0 + 75 = 1875.00
     */
    public function test_combined_eps_excluded_and_edli_exempted_reconciles_correctly(): void
    {
        $service = app(SalaryCalculationService::class);
        $data = [
            'basic_pay' => 15000.00,
            'date_of_birth' => '1990-01-01',
            'payroll_month' => '2026-07-01',
            'pf_applicable' => true,
            'eps_applicable' => false,  // Excluded from EPS
            'edli_exempted' => true,    // Exempted from EDLI
        ];

        $calc = $service->calculateStructuralSalary($data);

        $this->assertEquals(1800.00, $calc['employer_epf_monthly']);
        $this->assertEquals(0.00, $calc['employer_eps_monthly']);
        $this->assertEquals(0.00, $calc['edli_monthly']);
        $this->assertEquals(75.00, $calc['epf_admin_monthly']);
        $this->assertEquals(1875.00, $calc['employer_pf_monthly']);

        $sum = $calc['employer_epf_monthly'] + $calc['employer_eps_monthly'] + $calc['edli_monthly'] + $calc['epf_admin_monthly'];
        $this->assertEquals(1875.00, round($sum, 2));
    }
}
