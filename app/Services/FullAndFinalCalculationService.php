<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class FullAndFinalCalculationService
{
    /**
     * Calculates the entire settlement based on input factors.
     */
    public function calculatePreview(Employee $employee, array $inputs)
    {
        $lopBasisDays = (int) $employee->lop_basis_days ?: 30; // 26 or 30

        $calculations = [
            'pending_salary_amount' => 0,
            'leave_encashment_amount' => 0,
            'bonus_amount' => 0,
            'gratuity_amount' => 0,
            'notice_amount' => 0,
            'loan_recovery_amount' => 0,
            'tds_amount' => 0,
            'net_settlement_amount' => 0,
            'adhoc_adjustments' => $inputs['adhoc_adjustments'] ?? [],
        ];

        // 1. Pro-rated Pending Salary
        if (!empty($inputs['last_working_day'])) {
            $lwd = Carbon::parse($inputs['last_working_day']);
            // E.g., pro-rated for the final month. For simplicity here, we assume it's just the days worked in the final month.
            // Using gross_salary or basic depending on standard. Actually, for exit, you'd calculate net salary for that partial month.
            // But per requirement, we will calculate gross / lop_basis_days * days_worked, or let the user input it if it's complex.
            // Let's use the provided `pending_salary_amount` from inputs if given, or compute basic pro-ration.
            // We'll compute it if not provided. Actually, the mockup allowed setting it. We'll take it from input or compute a stub.
            $calculations['pending_salary_amount'] = (float) ($inputs['pending_salary_amount'] ?? 0);
        }

        // 2. Notice Period Shortfall
        if (!empty($inputs['notice_shortfall_days']) && !empty($inputs['notice_amount_type']) && $inputs['notice_amount_type'] !== 'none') {
            $shortfallDays = (int) $inputs['notice_shortfall_days'];
            if ($inputs['notice_amount_type'] === 'addition') {
                // Employer-Initiated (Notice Pay in Lieu): CTC / lop_basis_days * shortfall
                $calculations['notice_amount'] = round(($employee->ctc_monthly / $lopBasisDays) * $shortfallDays, 2);
            } elseif ($inputs['notice_amount_type'] === 'deduction') {
                // Employee-Initiated (Shortfall Recovery): Basic / lop_basis_days * shortfall
                $calculations['notice_amount'] = round(($employee->basic_pay / $lopBasisDays) * $shortfallDays, 2);
            }
        }

        // 3. Leave Encashment
        $unusedLeaves = (int) ($inputs['unused_leaves'] ?? 0);
        if ($unusedLeaves > 0) {
            $calculations['leave_encashment_amount'] = round($unusedLeaves * ($employee->basic_pay / $lopBasisDays), 2);
        }

        // 4. Gratuity (Payment of Gratuity Act 1972, Section 4(2))
        if (!empty($inputs['last_working_day'])) {
            $doj = Carbon::parse($employee->date_of_joining);
            $lwd = Carbon::parse($inputs['last_working_day']);
            $tenureDays = $doj->diffInDays($lwd);
            
            // Required threshold based on employment_type
            $isTemp = strtolower($employee->employment_type ?? 'permanent') === 'temporary';
            $minDays = $isTemp ? 365 : ((4 * 365) + 240); // 1 yr for temp, 4 yrs 240 days for permanent
            
            if ($tenureDays >= $minDays) {
                // Base salary = Basic + DA
                $baseSalary = (float)($employee->basic_pay ?: 0) + (float)($employee->da ?: 0);

                // Gratuity Act Sec 4(2): Completed full years + 1 year if remaining days >= 6 months (182 days)
                $fullYears = (int) $doj->diffInYears($lwd);
                $lastAnniversary = $doj->copy()->addYears($fullYears);
                $extraDays = (int) $lastAnniversary->diffInDays($lwd);
                $gratuityYears = ($extraDays >= 182) ? $fullYears + 1 : $fullYears;

                $calculations['gratuity_amount'] = round(($baseSalary / 26) * 15 * $gratuityYears, 2);
            }
        }

        // 5. PT Shortfall Recovery for Half-Yearly States (e.g. Tamil Nadu)
        $calculations['pt_shortfall_recovery'] = 0.00;
        if (!empty($inputs['last_working_day']) && $employee->pt_applicable) {
            $lwd = Carbon::parse($inputs['last_working_day']);
            
            // Resolve state
            $client = \Illuminate\Support\Facades\DB::table('clients')->where('id', $employee->client_id)->first();
            $ptState = $client ? $client->pt_state : null;
            if (empty($ptState) || $ptState === 'auto') {
                $branch = \Illuminate\Support\Facades\DB::table('client_branches')->where('id', $employee->branch_id)->first();
                $ptState = $branch ? $branch->state : null;
            }
            if (empty($ptState) && $client) {
                $ptState = $client->registered_state;
            }

            $stateMap = ['TN' => 'Tamil Nadu', 'MH' => 'Maharashtra', 'KA' => 'Karnataka'];
            if (!empty($ptState) && isset($stateMap[strtoupper($ptState)])) {
                $ptState = $stateMap[strtoupper($ptState)];
            }

            // Check if state is half-yearly (e.g. Tamil Nadu)
            $monthlyGross = (float)($employee->gross_monthly_salary ?: 0);
            $ptSlab = \Illuminate\Support\Facades\DB::table('pt_slabs')
                ->where('state', $ptState)
                ->where('frequency', 'half_yearly')
                ->where('is_active', true)
                ->where('min_salary', '<=', $monthlyGross)
                ->where(function($q) use ($monthlyGross) {
                    $q->where('max_salary', '>=', $monthlyGross)
                      ->orWhereNull('max_salary');
                })
                ->first();

            if ($ptSlab) {
                // Target half-yearly liability = monthly deduction rate * 6
                $targetHalfYearlyLiability = (float)$ptSlab->deduction_amount * 6;

                // Determine active 6-month half-year window (Apr-Sep vs Oct-Mar) using ESI period pattern
                $year = $lwd->year;
                $month = $lwd->month;
                if ($month >= 4 && $month <= 9) {
                    $cycleStart = Carbon::create($year, 4, 1)->startOfDay();
                    $cycleEnd = Carbon::create($year, 9, 30)->endOfDay();
                } else {
                    $startYear = ($month < 4) ? $year - 1 : $year;
                    $endYear = ($month < 4) ? $year : $year + 1;
                    $cycleStart = Carbon::create($startYear, 10, 1)->startOfDay();
                    $cycleEnd = Carbon::create($endYear, 3, 31)->endOfDay();
                }

                // Sum actual historical PT deducted in locked payroll runs within this active half-year cycle
                $actualDeductedSoFar = (float) \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->join('payroll_runs', 'payroll_run_items.payroll_run_id', '=', 'payroll_runs.id')
                    ->where('payroll_run_items.employee_id', $employee->id)
                    ->where('payroll_runs.status', 'locked')
                    ->whereBetween('payroll_runs.payroll_month', [$cycleStart->toDateString(), $cycleEnd->toDateString()])
                    ->sum('payroll_run_items.professional_tax');

                $calculations['pt_shortfall_recovery'] = max(0.00, round($targetHalfYearlyLiability - $actualDeductedSoFar, 2));
            }
        }

        // Other deductions (Auto-fetch remaining loan balance if not explicitly provided)
        if (array_key_exists('loan_recovery_amount', $inputs) && $inputs['loan_recovery_amount'] !== null) {
            $calculations['loan_recovery_amount'] = (float) $inputs['loan_recovery_amount'];
        } else {
            $calculations['loan_recovery_amount'] = (float) $employee->loans()->where('status', 'active')->sum('remaining_balance');
        }
        $calculations['tds_amount'] = (float) ($inputs['tds_amount'] ?? 0);
        $calculations['bonus_amount'] = (float) ($inputs['bonus_amount'] ?? 0);

        // Adhoc Adjustments total
        $adhocTotal = 0;
        foreach ($calculations['adhoc_adjustments'] as $adj) {
            $adhocTotal += (float) ($adj['amount'] ?? 0);
        }

        // Net Settlement Math
        $net = 0;
        $net += $calculations['pending_salary_amount'];
        $net += $calculations['leave_encashment_amount'];
        $net += $calculations['bonus_amount'];
        $net += $calculations['gratuity_amount'];
        $net += $adhocTotal;

        if (!empty($inputs['notice_amount_type']) && $inputs['notice_amount_type'] === 'addition') {
            $net += $calculations['notice_amount'];
        } elseif (!empty($inputs['notice_amount_type']) && $inputs['notice_amount_type'] === 'deduction') {
            $net -= $calculations['notice_amount'];
        }

        $net -= $calculations['loan_recovery_amount'];
        $net -= $calculations['tds_amount'];
        $net -= $calculations['pt_shortfall_recovery'];

        $calculations['net_settlement_amount'] = round($net, 2);

        return $calculations;
    }

    /**
     * Check if payroll is locked/approved for the given employee's client.
     */
    public function isPayrollLocked($employeeOrClientIdOrMonth, $monthOrYear = null, $year = null)
    {
        // If only 2 arguments are passed and the first is an integer/numeric, it's the old signature: isPayrollLocked($month, $year)
        if (func_num_args() === 2 && is_numeric($employeeOrClientIdOrMonth) && is_numeric($monthOrYear)) {
            $month = (int)$employeeOrClientIdOrMonth;
            $year = (int)$monthOrYear;
            $targetMonth = Carbon::create($year, $month, 1)->toDateString();
            return \Illuminate\Support\Facades\DB::table('payroll_runs')
                ->where('payroll_month', $targetMonth)
                ->whereIn('status', ['approved', 'locked'])
                ->exists();
        }

        $clientId = $employeeOrClientIdOrMonth instanceof \App\Models\Employee
            ? $employeeOrClientIdOrMonth->client_id
            : $employeeOrClientIdOrMonth;

        if (!$clientId) {
            return false;
        }

        $query = \Illuminate\Support\Facades\DB::table('payroll_runs')
            ->where('client_id', $clientId)
            ->whereIn('status', ['approved', 'locked']);

        if ($monthOrYear !== null && $year !== null) {
            $targetMonth = Carbon::create($year, $monthOrYear, 1)->toDateString();
            $query->where('payroll_month', $targetMonth);
        }

        return $query->exists();
    }
}
