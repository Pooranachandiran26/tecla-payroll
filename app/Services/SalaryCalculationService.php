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

        // 2. Calculate PF
        $employerPf = 0;
        $employeePf = 0;
        if (data_get($employeeData, 'pf_applicable', true)) {
            $pfBase = min($basic, self::PF_WAGE_CEILING);
            $employeePf = $pfBase * 0.12;
            $employerPf = $pfBase * 0.13;
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

        // 5. Net Take Home
        // Deductions: PF + ESI + PT + (LWF/TDS deferred or 0 for now as per instructions)
        $netTakeHome = $gross - ($employeePf + $employeeEsi + $pt);

        // 6. CTC
        $ctc = $gross + $employerPf + $employerEsi;

        return [
            'gross_monthly_salary' => round($gross, 2),
            'employer_pf_monthly' => round($employerPf, 2),
            'employer_esi_monthly' => round($employerEsi, 2),
            'net_take_home_monthly' => round($netTakeHome, 2),
            'ctc_monthly' => round($ctc, 2),
            // Including employee deductions to allow full UI breakdown
            'employee_pf_monthly' => round($employeePf, 2),
            'employee_esi_monthly' => round($employeeEsi, 2),
            'pt_monthly' => round($pt, 2),
        ];
    }
}
