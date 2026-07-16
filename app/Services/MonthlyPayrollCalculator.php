<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MonthlyPayrollCalculator
{
    protected $attendanceService;
    protected $salaryService;

    public function __construct(
        AttendanceResolutionService $attendanceService,
        SalaryCalculationService $salaryService
    ) {
        $this->attendanceService = $attendanceService;
        $this->salaryService = $salaryService;
    }

    /**
     * Calculate monthly payroll for a single employee and write to payroll_run_items.
     *
     * @param Employee $employee
     * @param object $payrollRun
     * @param array $overrides
     * @return array
     */
    public function calculateForEmployee(Employee $employee, $payrollRun, array $overrides = []): array
    {
        $monthStart = Carbon::parse($payrollRun->payroll_month)->startOfMonth()->startOfDay();
        $monthEnd = Carbon::parse($payrollRun->payroll_month)->endOfMonth()->startOfDay();
        $monthStartStr = $monthStart->toDateString();
        $monthEndStr = $monthEnd->toDateString();

        $lopBasisDays = (int)$employee->lop_basis_days ?: 30;

        // b. Check for mid-month salary revision
        $revision = DB::table('salary_revisions')
            ->where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereBetween('effective_date', [$monthStartStr, $monthEndStr])
            ->first();

        // a. Get attendance details (segmented if revision exists)
        if ($revision) {
            $effectiveDate = Carbon::parse($revision->effective_date)->startOfDay();
            $preEnd = $effectiveDate->copy()->subDay();

            $attendanceBefore = $this->attendanceService->resolveForEmployee($employee, $monthStartStr, $preEnd->toDateString());
            $attendanceAfter = $this->attendanceService->resolveForEmployee($employee, $effectiveDate->toDateString(), $monthEndStr);

            $paidDays = $attendanceBefore['paid_days'] + $attendanceAfter['paid_days'];
            $lopDays = $attendanceBefore['lop_days'] + $attendanceAfter['lop_days'];

            $sources = [];
            if ($attendanceBefore['attendance_source'] !== 'live_punch') $sources[] = $attendanceBefore['attendance_source'];
            if ($attendanceAfter['attendance_source'] !== 'live_punch') $sources[] = $attendanceAfter['attendance_source'];
            $attendanceSource = empty($sources) ? 'live_punch' : (count(array_unique($sources)) === 1 ? reset($sources) : 'mixed');
        } else {
            $attendance = $this->attendanceService->resolveForEmployee($employee, $monthStartStr, $monthEndStr);
            $paidDays = $attendance['paid_days'];
            $lopDays = $attendance['lop_days'];
            $attendanceSource = $attendance['attendance_source'];
        }

        $proRatedComponents = [];
        $components = [
            'basic_pay' => 'basic_pay',
            'hra' => 'hra',
            'conveyance' => 'conveyance',
            'da' => 'da',
            'medical_allowance' => 'medical_allowance',
            'special_allowance' => 'special_allowance',
            'other_additions' => 'other_additions'
        ];

        $calendarDays = $monthStart->diffInDays($monthEnd) + 1;
        $paidFraction = $paidDays / $calendarDays;

        if ($revision) {
            $effectiveDate = Carbon::parse($revision->effective_date)->startOfDay();
            $daysBefore = $monthStart->diffInDays($effectiveDate);
            $daysAfter = $effectiveDate->diffInDays($monthEnd) + 1;

            $paidDaysBefore = $attendanceBefore['paid_days'];
            $paidDaysAfter = $attendanceAfter['paid_days'];

            foreach ($components as $key => $column) {
                // Determine revision column naming
                $oldCol = 'old_' . $column;
                $newCol = 'new_' . $column;

                $oldVal = (float)($revision->$oldCol ?? 0);
                $newVal = (float)($revision->$newCol ?? 0);

                // Prorate old component and new component using formula scaled by actual segment paid days
                $oldComponentProrated = $oldVal * ($paidDaysBefore / $lopBasisDays);
                $newComponentProrated = $newVal * ($paidDaysAfter / $lopBasisDays);

                $proRatedComponents[$key] = round($oldComponentProrated + $newComponentProrated, 2);
            }
            $salaryRevisionApplied = true;
        } else {
            // No revision: component * (paid_days / lop_basis_days)
            foreach ($components as $key => $column) {
                $currentVal = (float)($employee->$column ?? 0);
                $proRatedComponents[$key] = round($currentVal * ($paidDays / $lopBasisDays), 2);
            }
            $salaryRevisionApplied = false;
        }

        // Calculate gross total first from prorated components
        $grossTotal = (float)array_sum($proRatedComponents);

        // Determine dynamic ESI applicability based on transition rules
        $isEsiActive = $this->isEsiApplicableForMonth($employee, $payrollRun, $grossTotal);

        // Build structural array and invoke SalaryCalculationService
        $employeeData = array_merge($proRatedComponents, [
            'pf_applicable' => (bool)$employee->pf_applicable,
            'esi_applicable' => $isEsiActive,
            // If ESI is active but gross > 21000, bypass the limit check by setting a huge limit
            'esi_limit' => $grossTotal > 21000 ? 99999999.00 : 21000.00,
            'pt_applicable' => false, // We handle PT calculation separately below
            'pt_deduction_override' => 0.00,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($employeeData);
        $employeePf = (float)$calc['employee_pf_monthly'];
        $employeeEsi = (float)$calc['employee_esi_monthly'];
        $employerPf = (float)$calc['employer_pf_monthly'];
        $employerEsi = (float)$calc['employer_esi_monthly'];

        // e. Add PT, LWF, and TDS
        
        // 1. PT Calculation
        $pt = 0.00;
        $ptWarning = null;
        if ($employee->pt_applicable) {
            $client = DB::table('clients')->where('id', $employee->client_id)->first();
            $ptState = $client ? $client->pt_state : null;
            if (empty($ptState) || $ptState === 'auto') {
                $branch = DB::table('client_branches')->where('id', $employee->branch_id)->first();
                $ptState = $branch ? $branch->state : null;
            }
            if (empty($ptState) && $client) {
                $ptState = $client->registered_state;
            }

            $ptSlab = DB::table('pt_slabs')
                ->where('state', $ptState)
                ->where('is_active', true)
                ->where('min_salary', '<=', $grossTotal)
                ->where(function($q) use ($grossTotal) {
                    $q->where('max_salary', '>=', $grossTotal)
                      ->orWhereNull('max_salary');
                })
                ->first();

            if ($ptSlab) {
                $pt = (float)$ptSlab->deduction_amount;
            } else {
                $ptWarning = "PT slab missing for state: " . ($ptState ?: 'Unknown');
            }
        }

        // 2. LWF Calculation
        $lwfDeduction = 0.00;
        $employerLwf = 0.00;
        if ($employee->lwf_applicable) {
            $branch = DB::table('client_branches')->where('id', $employee->branch_id)->first();
            $lwfState = $branch ? $branch->state : null;
            if (empty($lwfState)) {
                $client = DB::table('clients')->where('id', $employee->client_id)->first();
                $lwfState = $client ? $client->registered_state : null;
            }

            $lwfSlab = DB::table('lwf_slabs')
                ->where('state', $lwfState)
                ->where('is_active', true)
                ->first();

            if ($lwfSlab) {
                $month = Carbon::parse($payrollRun->payroll_month)->month;
                $shouldDeduct = false;

                if ($lwfSlab->frequency === 'monthly') {
                    $shouldDeduct = true;
                } elseif ($lwfSlab->frequency === 'half_yearly' && ($month === 6 || $month === 12)) {
                    $shouldDeduct = true;
                } elseif ($lwfSlab->frequency === 'yearly' && $month === 12) {
                    $shouldDeduct = true;
                }

                if ($shouldDeduct) {
                    $lwfDeduction = (float)$lwfSlab->employee_contribution;
                    $employerLwf = (float)$lwfSlab->employer_contribution;
                }
            }
        }

        // 3. TDS Calculation (Manual override)
        $tdsDeduction = (float)($overrides['tds_deduction'] ?? 0.00);

        // 4. Loan EMI Deduction
        $loanEmiDeduction = (float)($overrides['loan_emi_deduction'] ?? 0.00);

        // f. Apply the 50%-deduction cap
        $statutoryAndTaxDeductions = $employeePf + $employeeEsi + $pt + $lwfDeduction + $tdsDeduction;
        $totalDeductions = $statutoryAndTaxDeductions + $loanEmiDeduction;
        $capLimit = 0.5 * $grossTotal;

        $deferredLoanAmount = 0.00;
        $actualLoanDeduction = $loanEmiDeduction;

        if ($totalDeductions > $capLimit) {
            $excess = $totalDeductions - $capLimit;
            $actualLoanDeduction = max(0.00, $loanEmiDeduction - $excess);
            $deferredLoanAmount = $loanEmiDeduction - $actualLoanDeduction;
            $totalDeductions = $statutoryAndTaxDeductions + $actualLoanDeduction;
        }

        $netPay = $grossTotal - $totalDeductions;

        // Calculate LOP deduction based on structural gross difference
        if ($revision) {
            $structuralComponentsSum = 0.00;
            foreach ($components as $key => $column) {
                $oldCol = 'old_' . $column;
                $newCol = 'new_' . $column;
                $oldVal = (float)($revision->$oldCol ?? 0);
                $newVal = (float)($revision->$newCol ?? 0);

                $oldComponentProrated = $oldVal * ($daysBefore / $lopBasisDays);
                $newComponentProrated = $newVal * ($daysAfter / $lopBasisDays);
                $structuralComponentsSum += ($oldComponentProrated + $newComponentProrated);
            }
            $structuralGross = $structuralComponentsSum;
        } else {
            $structuralGross = (float)$employee->basic_pay + 
                               (float)$employee->hra + 
                               (float)$employee->conveyance + 
                               (float)$employee->da + 
                               (float)$employee->medical_allowance + 
                               (float)$employee->special_allowance + 
                               (float)$employee->other_additions;
        }
        $lopDeduction = max(0.00, $structuralGross - $grossTotal);

        // g. Write the result to a new payroll_run_items row
        $runItemId = DB::table('payroll_run_items')->insertGetId([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $employee->id,
            'paid_days' => $paidDays,
            'lop_days' => $lopDays,
            'basic_pay' => $proRatedComponents['basic_pay'],
            'hra' => $proRatedComponents['hra'],
            'conveyance' => $proRatedComponents['conveyance'],
            'da' => $proRatedComponents['da'],
            'medical_allowance' => $proRatedComponents['medical_allowance'],
            'special_allowance' => $proRatedComponents['special_allowance'],
            'other_additions' => $proRatedComponents['other_additions'],
            'gross_total' => $grossTotal,
            'employee_pf' => $employeePf,
            'employee_esi' => $employeeEsi,
            'professional_tax' => $pt,
            'lwf_deduction' => $lwfDeduction,
            'lop_deduction' => $lopDeduction,
            'tds_deduction' => $tdsDeduction,
            'loan_emi_deduction' => $actualLoanDeduction,
            'deferred_loan_amount' => $deferredLoanAmount,
            'net_pay' => $netPay,
            'employer_pf' => $employerPf,
            'employer_esi' => $employerEsi,
            'employer_lwf' => $employerLwf,
            'is_excluded' => false,
            'exclusion_reason' => null,
            'warning_notes' => $ptWarning,
            'attendance_source' => $attendanceSource,
            'salary_revision_applied' => $salaryRevisionApplied,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return array_merge($proRatedComponents, [
            'id' => $runItemId,
            'paid_days' => $paidDays,
            'lop_days' => $lopDays,
            'gross_total' => $grossTotal,
            'employee_pf' => $employeePf,
            'employee_esi' => $employeeEsi,
            'professional_tax' => $pt,
            'lwf_deduction' => $lwfDeduction,
            'lop_deduction' => $lopDeduction,
            'tds_deduction' => $tdsDeduction,
            'loan_emi_deduction' => $actualLoanDeduction,
            'deferred_loan_amount' => $deferredLoanAmount,
            'net_pay' => $netPay,
            'employer_pf' => $employerPf,
            'employer_esi' => $employerEsi,
            'employer_lwf' => $employerLwf,
            'employer_statutory_cost' => round($employerPf + $employerEsi + $employerLwf, 2),
            'salary_revision_applied' => $salaryRevisionApplied,
        ]);
    }

    /**
     * Determine dynamic ESI applicability for the month based on transition rules.
     */
    public function isEsiApplicableForMonth(Employee $employee, $payrollRun, float $grossTotal): bool
    {
        if (!$employee->esi_applicable) {
            return false;
        }

        $currentDate = Carbon::parse($payrollRun->payroll_month)->startOfDay();
        [$periodStart, $periodEnd] = $this->getEsiPeriod($currentDate);

        // 1. Check if there is an active crossing month in the current period
        if ($employee->esi_threshold_crossed_month) {
            $crossingDate = Carbon::parse($employee->esi_threshold_crossed_month)->startOfDay();
            if ($crossingDate->greaterThanOrEqualTo($periodStart) && $crossingDate->lessThanOrEqualTo($periodEnd)) {
                return true;
            }
        }

        // 2. Check if we are at the start month of the contribution period
        $startMonthStr = $periodStart->toDateString();
        
        if ($currentDate->toDateString() === $startMonthStr) {
            if ($grossTotal <= 21000) {
                return true;
            }
            return false;
        }

        // 3. Mid-period: Check if the employee contributed in the first month of the current period
        $startRunItem = DB::table('payroll_run_items')
            ->join('payroll_runs', 'payroll_run_items.payroll_run_id', '=', 'payroll_runs.id')
            ->where('payroll_run_items.employee_id', $employee->id)
            ->where('payroll_runs.payroll_month', $startMonthStr)
            ->first();

        $wasEsiActiveAtStart = false;
        if ($startRunItem) {
            $wasEsiActiveAtStart = $startRunItem->employee_esi > 0;
        } else {
            // Find first payroll run item in the current period before today
            $firstRunItem = DB::table('payroll_run_items')
                ->join('payroll_runs', 'payroll_run_items.payroll_run_id', '=', 'payroll_runs.id')
                ->where('payroll_run_items.employee_id', $employee->id)
                ->whereBetween('payroll_runs.payroll_month', [$startMonthStr, $currentDate->copy()->subMonth()->toDateString()])
                ->orderBy('payroll_runs.payroll_month', 'asc')
                ->first();

            if ($firstRunItem) {
                $wasEsiActiveAtStart = $firstRunItem->employee_esi > 0;
            } else {
                // If there's no history in this period, we assume they entered period active.
                $wasEsiActiveAtStart = true;
            }
        }

        if ($wasEsiActiveAtStart) {
            if ($grossTotal <= 21000) {
                return true;
            } else {
                // First time crossing mid-period! Persist the crossing month.
                $employee->update(['esi_threshold_crossed_month' => $payrollRun->payroll_month]);
                return true;
            }
        }

        return false;
    }

    /**
     * Determine statutory ESI contribution period boundaries.
     */
    public function getEsiPeriod(Carbon $date): array
    {
        $year = $date->year;
        $month = $date->month;
        
        if ($month >= 4 && $month <= 9) {
            $start = Carbon::create($year, 4, 1)->startOfDay();
            $end = Carbon::create($year, 9, 30)->endOfDay();
        } else {
            if ($month >= 10) {
                $start = Carbon::create($year, 10, 1)->startOfDay();
                $end = Carbon::create($year + 1, 3, 31)->endOfDay();
            } else {
                $start = Carbon::create($year - 1, 10, 1)->startOfDay();
                $end = Carbon::create($year, 3, 31)->endOfDay();
            }
        }
        return [$start, $end];
    }
}
