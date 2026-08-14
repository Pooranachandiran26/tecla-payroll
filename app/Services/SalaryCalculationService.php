<?php

namespace App\Services;

class SalaryCalculationService
{
    /**
     * The statutory ceiling for PF calculation.
     */
    public const PF_WAGE_CEILING = 15000;

    /**
     * The statutory ceiling for ESI calculation for standard employees.
     */
    public const ESI_WAGE_CEILING = 21000;

    /**
     * The statutory ceiling for ESI calculation for Persons with Benchmark Disabilities (PwD).
     */
    public const ESI_DISABILITY_WAGE_CEILING = 25000;

    /**
     * The statutory ceiling for EPS calculation.
     */
    public const EPS_WAGE_CEILING = 15000;

    /**
     * The statutory age cutoff for EPS eligibility.
     */
    public const EPS_AGE_CUTOFF = 58;

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
        $employerEpfTotal = 0.00;
        $employerEpf = 0.00;
        $employerEps = 0.00;
        $edli = 0.00;
        $epfAdmin = 0.00;
        $employerPf = 0.00;
        $employeePf = 0.00;
        $employeeVpf = 0.00;

        if (data_get($employeeData, 'pf_applicable', true)) {
            $pfCeiling = (float) data_get($employeeData, 'pf_ceiling', $client->pf_ceiling ?? self::PF_WAGE_CEILING);
            if ($pfCeiling <= 0) {
                $pfCeiling = self::PF_WAGE_CEILING;
            }

            $basicDa = $basic + $da;

            $empWageBasis = data_get($employeeData, 'employee_pf_wage_basis');
            if (empty($empWageBasis)) {
                $empWageBasis = $client ? ($client->employee_pf_wage_basis ?? 'ceiling') : 'ceiling';
            }

            $emprWageBasis = data_get($employeeData, 'employer_pf_wage_basis');
            if (empty($emprWageBasis)) {
                $emprWageBasis = $client ? ($client->employer_pf_wage_basis ?? 'ceiling') : 'ceiling';
            }

            $employeePfWage = ($empWageBasis === 'actual_basic_da') ? $basicDa : min($basicDa, $pfCeiling);
            $employerPfWage = ($emprWageBasis === 'actual_basic_da') ? $basicDa : min($basicDa, $pfCeiling);

            $employeePf = $employeePfWage * 0.12;
            $employerEpfTotal = $employerPfWage * 0.12;

            $isEdliExempt = $client ? (bool)$client->edli_exempted : (bool)data_get($employeeData, 'edli_exempted', false);

            $cappedPfWage = min($basicDa, self::PF_WAGE_CEILING);
            $edli = $isEdliExempt ? 0.00 : ($cappedPfWage * 0.005);
            $epfAdmin = $cappedPfWage * 0.005;
            $employerPf = $employerEpfTotal + $edli + $epfAdmin;

            // Evaluate EPS Eligibility & Age 58 Cutoff
            $dob = data_get($employeeData, 'date_of_birth');
            $calcDate = data_get($employeeData, 'payroll_month') ? \Carbon\Carbon::parse(data_get($employeeData, 'payroll_month')) : now();
            $age = $dob ? \Carbon\Carbon::parse($dob)->diffInYears($calcDate) : 0;
            $isOver58 = $age >= 58;

            $epsApplicable = (bool) data_get($employeeData, 'eps_applicable', true);
            $isEpsEligible = $epsApplicable && !$isOver58;

            if ($isEpsEligible) {
                $epsBase = min($basicDa, self::EPS_WAGE_CEILING);
                $employerEps = round($epsBase * (8.33 / 100), 2); // 1249.50 for 15k base
                $employerEpf = round($employerEpfTotal - $employerEps, 2);
            } else {
                $employerEps = 0.00;
                $employerEpf = round($employerEpfTotal, 2);
            }

            // Voluntary Provident Fund (VPF) — 100% Employee-Side Only (EPF Scheme 1952, Para 29)
            // Calculated ALWAYS on actual Basic+DA regardless of mandatory EPF wage basis (ceiling vs actual)
            $vpfEnabled = filter_var(data_get($employeeData, 'vpf_enabled', false), FILTER_VALIDATE_BOOLEAN);
            if ($vpfEnabled) {
                $vpfType = data_get($employeeData, 'vpf_type', 'percentage');
                $vpfValue = (float) data_get($employeeData, 'vpf_value', 0);

                if ($vpfType === 'percentage' && $vpfValue > 0) {
                    $vpfRate = min(88.0, $vpfValue); // Capped at 88% so mandatory 12% + VPF <= 100% of Basic+DA
                    $employeeVpf = round($basicDa * ($vpfRate / 100), 2);
                } elseif ($vpfType === 'fixed_amount' && $vpfValue > 0) {
                    $maxVpf = max(0.00, $basicDa - $employeePf);
                    $employeeVpf = round(min($vpfValue, $maxVpf), 2);
                }
            }
        }

        // 3. Calculate ESI
        $employerEsi = 0;
        $employeeEsi = 0;
        $isDisabled = filter_var(data_get($employeeData, 'is_disabled', false), FILTER_VALIDATE_BOOLEAN);
        $clientEsiLimit = $client ? (float)($client->esi_limit ?? self::ESI_WAGE_CEILING) : self::ESI_WAGE_CEILING;
        $effectiveDefaultCeiling = $isDisabled ? max((float)self::ESI_DISABILITY_WAGE_CEILING, $clientEsiLimit) : $clientEsiLimit;

        $esiLimit = (float) data_get($employeeData, 'esi_limit', $effectiveDefaultCeiling);
        if (data_get($employeeData, 'esi_applicable', true) && $gross <= $esiLimit) {
            $employeeEsi = $gross * 0.0075; // 0.75%
            $employerEsi = $gross * 0.0325; // 3.25%
        }

        // 4. Professional Tax
        $ptOverride = data_get($employeeData, 'pt_deduction_override');
        $pt = 0.00;
        $empPtApp = data_get($employeeData, 'pt_applicable');
        $ptState = data_get($employeeData, 'pt_state', $client->pt_state ?? $client->registered_state ?? null);
        $isPtActive = filter_var($empPtApp ?? true, FILTER_VALIDATE_BOOLEAN) && !empty($ptState);

        if ($ptOverride !== null && $ptOverride !== '') {
            $pt = (float) $ptOverride;
        } elseif ($isPtActive && !empty($ptState)) {
            $stateMap = [
                'TN' => 'Tamil Nadu',
                'MH' => 'Maharashtra',
                'KA' => 'Karnataka',
                'TS' => 'Telangana',
                'WB' => 'West Bengal',
                'GJ' => 'Gujarat',
            ];
            if (isset($stateMap[strtoupper($ptState)])) {
                $ptState = $stateMap[strtoupper($ptState)];
            }

            $gender = data_get($employeeData, 'gender');
            if ($ptState === 'Maharashtra' && strtolower((string)$gender) === 'female' && $gross <= 25000) {
                $pt = 0.00;
            } else {
                $ptSlab = \Illuminate\Support\Facades\DB::table('pt_slabs')
                    ->where('state', $ptState)
                    ->where('is_active', true)
                    ->where('min_salary', '<=', $gross)
                    ->where(function($q) use ($gross) {
                        $q->where('max_salary', '>=', $gross)
                          ->orWhereNull('max_salary');
                    })
                    ->first();

                if ($ptSlab) {
                    $pt = (float) $ptSlab->deduction_amount;
                }
            }
        }

        // 5. Gratuity Accrual (15 days per year = Basic * (15 / 26 / 12) = 4.80769% of Basic)
        // Included in CTC ONLY IF client gratuity_applicable = true AND employee gratuity_mode = 'part_of_ctc'
        $gratuityAccrual = 0.00;
        
        $gratuityApplicable = $client ? (bool)($client->gratuity_applicable ?? false) : (bool)data_get($employeeData, 'gratuity_applicable', true);
        $gratuityMode = data_get($employeeData, 'gratuity_mode', $client->default_gratuity_mode ?? 'part_of_ctc');
        
        if ($gratuityApplicable && ($gratuityMode === 'part_of_ctc' || $gratuityMode === 'ctc_included')) {
            $gratuityBase = $basic + $da;
            $gratuityAccrual = $gratuityBase * (15 / 26 / 12);
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
        // Deductions: PF (Mandatory EPF + Voluntary VPF) + ESI + PT
        $totalEmployeePf = $employeePf + $employeeVpf;
        $netTakeHome = $gross - ($totalEmployeePf + $employeeEsi + $pt);

        // 8. CTC = Gross + Employer PF + Employer ESI + Gratuity Accrual + Statutory Bonus Accrual
        $ctc = $gross + $employerPf + $employerEsi + $gratuityAccrual + $bonusAccrual;

        return [
            'gross_monthly_salary' => round($gross, 2),
            'employer_pf_monthly' => round($employerPf, 2),
            'employer_epf_monthly' => round($employerEpf, 2),
            'employer_eps_monthly' => round($employerEps, 2),
            'edli_monthly' => round($edli, 2),
            'epf_admin_monthly' => round($epfAdmin, 2),
            'employer_esi_monthly' => round($employerEsi, 2),
            'gratuity_accrual_monthly' => round($gratuityAccrual, 2),
            'bonus_accrual_monthly' => round($bonusAccrual, 2),
            'net_take_home_monthly' => round($netTakeHome, 2),
            'ctc_monthly' => round($ctc, 2),
            // Including employee deductions to allow full UI breakdown
            'employee_pf_monthly' => round($employeePf, 2),
            'employee_vpf_monthly' => round($employeeVpf, 2),
            'total_employee_pf_monthly' => round($totalEmployeePf, 2),
            'employee_esi_monthly' => round($employeeEsi, 2),
            'pt_monthly' => round($pt, 2),
        ];
    }
}
