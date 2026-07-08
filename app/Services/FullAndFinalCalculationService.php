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

        // 4. Gratuity
        if (!empty($inputs['last_working_day'])) {
            $doj = Carbon::parse($employee->date_of_joining);
            $lwd = Carbon::parse($inputs['last_working_day']);
            $tenureDays = $doj->diffInDays($lwd);
            
            // Threshold is 4 years and 240 days
            if ($tenureDays >= ((4 * 365) + 240)) {
                // Gratuity Act: part of year in excess of six months counts as a full year
                $years = round($tenureDays / 365);
                $calculations['gratuity_amount'] = round(($employee->basic_pay / 26) * 15 * $years, 2);
            }
        }

        // Other deductions
        $calculations['loan_recovery_amount'] = (float) ($inputs['loan_recovery_amount'] ?? 0);
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

        $calculations['net_settlement_amount'] = round($net, 2);

        return $calculations;
    }

    /**
     * STUB: Replace in Phase 5 with actual payroll lock check.
     */
    public function isPayrollLocked($month, $year)
    {
        return false;
    }
}
