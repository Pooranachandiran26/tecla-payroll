<?php

namespace App\Services;

class SalaryCalculationService
{
    /**
     * The statutory ceiling for PF calculation.
     */
    public const PF_WAGE_CEILING = 15000;

    /**
     * The statutory ceiling for ESI calculation.
     */
    public const ESI_WAGE_CEILING = 21000;

    /**
     * Calculate structural/sanctioned salary components for an employee.
     * 
     * NOTE: These computed fields represent the employee's SANCTIONED/STRUCTURAL 
     * salary (as per their offer letter / CTC agreement), calculated at full 
     * attendance with no LOP. They are NOT the same as a specific month's actual 
     * paid amount, which depends on attendance/LOP and is calculated separately 
     * during actual Payroll Processing runs.
     *
     * @param array|object $employeeData Data containing basic_pay and other earnings, plus statutory toggles
     * @return array Calculated fields
     */
    public function calculateStructuralSalary($employeeData): array
    {
        // 1. Calculate Gross
        $basic = (float) data_get($employeeData, 'basic_pay', 0);
        $hra = (float) data_get($employeeData, 'hra', 0);
        $conveyance = (float) data_get($employeeData, 'conveyance', 0);
        $da = (float) data_get($employeeData, 'da', 0);
        $medical = (float) data_get($employeeData, 'medical_allowance', 0);
        $special = (float) data_get($employeeData, 'special_allowance', 0);
        $other = (float) data_get($employeeData, 'other_additions', 0);

        $gross = $basic + $hra + $conveyance + $da + $medical + $special + $other;

        $clientId = data_get($employeeData, 'client_id');
        $client = $clientId ? \App\Models\Client::find($clientId) : null;

        // 2. Calculate PF & Employer Statutory Contributions
        $employerEpf = 0.00;
        $edli = 0.00;
        $epfAdmin = 0.00;
        $employerPf = 0.00;
        $employeePf = 0.00;

        if (data_get($employeeData, 'pf_applicable', true)) {
            $pfCeiling = (float) data_get($employeeData, 'pf_ceiling', $client->pf_ceiling ?? self::PF_WAGE_CEILING);
            if ($pfCeiling <= 0) {
                $pfCeiling = self::PF_WAGE_CEILING;
            }
            $pfBase = min($basic, $pfCeiling);
            $employeePf = $pfBase * 0.12;

            $isEdliExempt = $client ? (bool)$client->edli_exempted : (bool)data_get($employeeData, 'edli_exempted', false);

            $employerEpf = $pfBase * 0.12;
            $edli = $isEdliExempt ? 0.00 : ($pfBase * 0.005);
            $epfAdmin = $pfBase * 0.005;
            $employerPf = $employerEpf + $edli + $epfAdmin;
        }

        // 3. Calculate ESI
        $employerEsi = 0;
        $employeeEsi = 0;
        $esiLimit = (float) data_get($employeeData, 'esi_limit', self::ESI_WAGE_CEILING);
        if (data_get($employeeData, 'esi_applicable', true) && $gross <= $esiLimit) {
            $employeeEsi = $gross * 0.0075; // 0.75%
            $employerEsi = $gross * 0.0325; // 3.25%
        }

        // 4. Professional Tax
        // Use override if set, otherwise 0
        $ptOverride = data_get($employeeData, 'pt_deduction_override');
        $pt = $ptOverride !== null && $ptOverride !== '' ? (float) $ptOverride : 0;

        // 5. Gratuity Accrual (15 days per year = Basic * (15 / 26 / 12) = 4.80769% of Basic)
        // Included in CTC ONLY IF client gratuity_applicable = true AND employee gratuity_mode = 'part_of_ctc'
        $gratuityAccrual = 0.00;
        
        $gratuityApplicable = $client ? (bool)($client->gratuity_applicable ?? false) : (bool)data_get($employeeData, 'gratuity_applicable', true);
        $gratuityMode = data_get($employeeData, 'gratuity_mode', $client->default_gratuity_mode ?? 'part_of_ctc');
        
        if ($gratuityApplicable && ($gratuityMode === 'part_of_ctc' || $gratuityMode === 'ctc_included')) {
            $gratuityAccrual = $basic * (15 / 26 / 12);
        }

        // 6. Statutory Bonus Accrual (Payment of Bonus Act 1965 as amended in 2015)
        // - Eligibility Cap: Basic pay <= Rs. 21,000/month (Sec 2(13)). Basic > Rs. 21,000 gets Rs. 0.00.
        // - Calculation Base Ceiling: Min(Basic, Max(7000, state_min_wage)) (Sec 12).
        $bonusAccrual = 0.00;
        $bonusApplicable = $client ? (bool)($client->statutory_bonus_applicable ?? false) : (bool)data_get($employeeData, 'statutory_bonus_applicable', false);
        $bonusPct = $client ? (float)($client->bonus_rate_percentage ?? $client->statutory_bonus_percentage ?? 8.33) : (float)data_get($employeeData, 'statutory_bonus_percentage', 8.33);

        if ($bonusApplicable && $basic <= 21000.00) {
            $stateMinWage = (float)data_get($employeeData, 'state_minimum_wage', 0);
            $calcCeiling = max(7000.00, $stateMinWage);
            $bonusBase = min($basic, $calcCeiling);
            $bonusAccrual = $bonusBase * ($bonusPct / 100);
        }

        // 7. Net Take Home
        // Deductions: PF + ESI + PT
        $netTakeHome = $gross - ($employeePf + $employeeEsi + $pt);

        // 8. CTC = Gross + Employer PF + Employer ESI + Gratuity Accrual + Statutory Bonus Accrual
        $ctc = $gross + $employerPf + $employerEsi + $gratuityAccrual + $bonusAccrual;

        return [
            'gross_monthly_salary' => round($gross, 2),
            'employer_pf_monthly' => round($employerPf, 2),
            'employer_epf_monthly' => round($employerEpf, 2),
            'edli_monthly' => round($edli, 2),
            'epf_admin_monthly' => round($epfAdmin, 2),
            'employer_esi_monthly' => round($employerEsi, 2),
            'gratuity_accrual_monthly' => round($gratuityAccrual, 2),
            'bonus_accrual_monthly' => round($bonusAccrual, 2),
            'net_take_home_monthly' => round($netTakeHome, 2),
            'ctc_monthly' => round($ctc, 2),
            // Including employee deductions to allow full UI breakdown
            'employee_pf_monthly' => round($employeePf, 2),
            'employee_esi_monthly' => round($employeeEsi, 2),
            'pt_monthly' => round($pt, 2),
        ];
    }
}
