<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EmployeeQuery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Spatie\SimpleExcel\SimpleExcelReader;

class PayrollCorrectionService
{
    protected $salaryService;
    protected $attendanceValidationService;

    public function __construct(
        SalaryCalculationService $salaryService,
        AttendanceUploadValidationService $attendanceValidationService
    ) {
        $this->salaryService = $salaryService;
        $this->attendanceValidationService = $attendanceValidationService;
    }

    /**
     * Calculate a read-only, side-effect-free preview of a payroll correction for a single employee.
     */
    public function calculateCorrectionPreview(
        Employee $employee,
        PayrollRun $parentRun,
        float $correctedPaidDays,
        float $correctedLopDays
    ): array {
        // 1. Fetch original parent/supplementary run item across run family (non-correction item)
        $allRunIds = $parentRun->children()->pluck('id')->prepend($parentRun->id)->toArray();

        $originalItem = DB::table('payroll_run_items')
            ->whereIn('payroll_run_id', $allRunIds)
            ->where('employee_id', $employee->id)
            ->where(function ($q) {
                $q->where('is_correction', false)
                  ->orWhereNull('is_correction');
            })
            ->orderBy('id', 'asc')
            ->first();

        if (!$originalItem) {
            throw new \Exception("Employee does not exist in the specified parent payroll run.");
        }

        $clientModel = $employee->client ?? \App\Models\Client::find($employee->client_id);
        if ($clientModel) {
            app(PayrollCycleWarningService::class)->ensureCycleEnded($clientModel, $parentRun->payroll_month);
        }

        $monthStart = Carbon::parse($parentRun->payroll_month)->startOfMonth();
        $monthEnd = Carbon::parse($parentRun->payroll_month)->endOfMonth();
        $calendarDays = $monthStart->daysInMonth;
        $lopBasisDays = (int)$employee->lop_basis_days ?: 30;

        // Check for mid-month salary revision
        $revision = DB::table('salary_revisions')
            ->where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereBetween('effective_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->first();

        $components = [
            'basic_pay' => 'basic_pay',
            'hra' => 'hra',
            'conveyance' => 'conveyance',
            'da' => 'da',
            'medical_allowance' => 'medical_allowance',
            'special_allowance' => 'special_allowance',
            'other_additions' => 'other_additions',
        ];

        $proRatedComponents = [];

        if ($revision) {
            $effectiveDate = Carbon::parse($revision->effective_date)->startOfDay();
            $daysBefore = (int)round($monthStart->diffInDays($effectiveDate));
            $daysAfter = (int)round($effectiveDate->diffInDays($monthEnd) + 1);

            $paidRatio = $correctedPaidDays / max(1, $calendarDays);
            $paidDaysBefore = round($daysBefore * $paidRatio, 2);
            $paidDaysAfter = round($daysAfter * $paidRatio, 2);

            foreach ($components as $key => $column) {
                $oldCol = 'old_' . $column;
                $newCol = 'new_' . $column;
                $oldVal = (float)($revision->$oldCol ?? 0);
                $newVal = (float)($revision->$newCol ?? 0);

                $oldComponentProrated = $oldVal * ($paidDaysBefore / $lopBasisDays);
                $newComponentProrated = $newVal * ($paidDaysAfter / $lopBasisDays);

                $proRatedComponents[$key] = round($oldComponentProrated + $newComponentProrated, 2);
            }
        } else {
            $effectiveStart = Carbon::parse($employee->date_of_joining)->startOfDay();
            $isMidMonthHire = $effectiveStart->gt($monthStart);

            foreach ($components as $key => $column) {
                $currentVal = (float)($employee->$column ?? 0);

                if ($isMidMonthHire) {
                    $proRatedComponents[$key] = round($currentVal * min(1.0, $correctedPaidDays / $calendarDays), 2);
                } else {
                    if ($correctedLopDays == 0) {
                        $proRatedComponents[$key] = round($currentVal, 2);
                    } else {
                        $componentLopDeduction = round($currentVal * ($correctedLopDays / $lopBasisDays), 2);
                        $proRatedComponents[$key] = max(0.00, round($currentVal - $componentLopDeduction, 2));
                    }
                }
            }
        }

        $grossTotal = round((float)array_sum($proRatedComponents), 2);

        // Derive ESI applicability
        $isEsiActive = (bool)$employee->esi_applicable;
        if ($isEsiActive && $grossTotal > 21000) {
            $isEsiActive = false; // Gross ceiling
        }

        $employeeData = array_merge($proRatedComponents, [
            'client_id' => $employee->client_id,
            'pf_applicable' => (bool)$employee->pf_applicable,
            'eps_applicable' => (bool)$employee->eps_applicable,
            'employee_pf_wage_basis' => $employee->employee_pf_wage_basis,
            'employer_pf_wage_basis' => $employee->employer_pf_wage_basis,
            'date_of_birth' => $employee->date_of_birth,
            'esi_applicable' => $isEsiActive,
            'esi_limit' => $grossTotal > 21000 ? 99999999.00 : 21000.00,
            'pt_applicable' => false,
            'pt_deduction_override' => 0.00,
        ]);

        $calc = $this->salaryService->calculateStructuralSalary($employeeData);
        $employeePf = (float)$calc['employee_pf_monthly'];
        $employeeEsi = (float)$calc['employee_esi_monthly'];
        $employerPf = (float)$calc['employer_pf_monthly'];
        $employerEpf = (float)$calc['employer_epf_monthly'];
        $employerEps = (float)$calc['employer_eps_monthly'];
        $employerEsi = (float)$calc['employer_esi_monthly'];

        // Professional Tax Calculation
        $pt = 0.00;
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
                ->where(function ($q) use ($grossTotal) {
                    $q->where('max_salary', '>=', $grossTotal)
                      ->orWhereNull('max_salary');
                })
                ->first();

            if ($ptSlab) {
                $pt = (float)$ptSlab->deduction_amount;
            }
        }

        // LWF Calculation
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
                $month = $monthStart->month;
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

        // TDS Calculation
        $overrides = ['paid_days_ratio' => $correctedPaidDays / max(1, $calendarDays)];
        $tdsService = app(TdsCalculationService::class);
        $tdsDeduction = $tdsService->calculateMonthlyTds($employee, $parentRun->payroll_month, $overrides);

        // Loan EMI Calculation
        $loanEmiDeduction = $employee->activeLoansEmiSumForMonth($parentRun->payroll_month);

        $shortfallPt = (float)($originalItem->pt_shortfall_recovery ?? 0.00);
        $statutoryAndTaxDeductions = $employeePf + $employeeEsi + $pt + $shortfallPt + $lwfDeduction + $tdsDeduction;
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

        $structuralGross = (float)$employee->basic_pay + (float)$employee->hra + (float)$employee->conveyance +
            (float)$employee->da + (float)$employee->medical_allowance + (float)$employee->special_allowance + (float)$employee->other_additions;
        $lopDeduction = round(max(0.00, $structuralGross - $grossTotal), 2);

        $correctedModel = [
            'paid_days' => $correctedPaidDays,
            'lop_days' => $correctedLopDays,
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
            'pt_shortfall_recovery' => $shortfallPt,
            'lwf_deduction' => $lwfDeduction,
            'lop_deduction' => $lopDeduction,
            'tds_deduction' => $tdsDeduction,
            'loan_emi_deduction' => $actualLoanDeduction,
            'net_pay' => $netPay,
            'employer_pf' => $employerPf,
            'employer_epf' => $employerEpf,
            'employer_eps' => $employerEps,
            'employer_esi' => $employerEsi,
            'employer_lwf' => $employerLwf,
            'deferred_loan_amount' => $deferredLoanAmount,
        ];

        // Compute Component-wise Deltas (Corrected - Original Base Item)
        $delta = [];
        foreach ($correctedModel as $field => $val) {
            $origVal = isset($originalItem->$field) ? (float)$originalItem->$field : 0.00;
            $delta[$field] = round((float)$val - $origVal, 2);
        }

        $workingDaysContext = $this->attendanceValidationService->calculateWorkingDaysContext(
            $parentRun->client_id,
            $monthStart->format('Y-m'),
            $employee
        );

        return [
            'employee' => [
                'id' => $employee->id,
                'full_name' => $employee->full_name,
                'employee_code' => $employee->employee_code,
            ],
            'original' => (array)$originalItem,
            'corrected' => $correctedModel,
            'delta' => $delta,
            'working_days_context' => $workingDaysContext,
        ];
    }

    /**
     * Detect systemic pattern alerts across locked run items (informational context).
     */
    public function detectSystemicPatterns(PayrollRun $parentRun): array
    {
        $items = DB::table('payroll_run_items')
            ->where('payroll_run_id', $parentRun->id)
            ->where('is_excluded', false)
            ->get();

        $totalCount = $items->count();
        if ($totalCount === 0) {
            return [
                'pattern_type' => 'none',
                'summary' => 'No processed employees in parent run.',
                'clustered_dates' => [],
                'affected_count' => 0,
            ];
        }

        $monthStart = Carbon::parse($parentRun->payroll_month)->startOfMonth()->toDateString();
        $monthEnd = Carbon::parse($parentRun->payroll_month)->endOfMonth()->toDateString();

        $empIds = $items->pluck('employee_id')->toArray();

        $lopRecords = DB::table('attendance_records')
            ->whereIn('employee_id', $empIds)
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->where('status', 'absent')
            ->get();

        $dateGroup = $lopRecords->groupBy('attendance_date');
        $clusteredDates = [];

        foreach ($dateGroup as $dateStr => $group) {
            $count = $group->count();
            if ($count >= max(2, (int)round($totalCount * 0.5))) {
                $clusteredDates[] = [
                    'date' => $dateStr,
                    'affected_count' => $count,
                ];
            }
        }

        $uploadedCount = DB::table('attendance_records')
            ->whereIn('employee_id', $empIds)
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->where('source', 'uploaded')
            ->distinct('employee_id')
            ->count('employee_id');

        if (!empty($clusteredDates)) {
            $topCluster = $clusteredDates[0];
            return [
                'pattern_type' => 'holiday_cluster',
                'summary' => "{$topCluster['affected_count']} of {$totalCount} employees have LOP on {$topCluster['date']} (Possible missing holiday or unconfigured weekly off).",
                'clustered_dates' => $clusteredDates,
                'affected_count' => $topCluster['affected_count'],
            ];
        }

        if ($uploadedCount >= (int)round($totalCount * 0.7)) {
            return [
                'pattern_type' => 'uploaded_file',
                'summary' => "{$uploadedCount} of {$totalCount} employees were processed via Attendance Upload (Possible bad upload file).",
                'clustered_dates' => [],
                'affected_count' => $uploadedCount,
            ];
        }

        return [
            'pattern_type' => 'individual_variances',
            'summary' => "Individual variances detected across employee attendance records.",
            'clustered_dates' => [],
            'affected_count' => 0,
        ];
    }

    /**
     * Parse uploaded correction file (.xlsx/.csv) without database mutation.
     */
    public function parseCorrectionFile(string $filePath, PayrollRun $parentRun): array
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw new \Exception("File is not readable or does not exist.");
        }

        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $rawRows = [];

        $isXlsx = in_array($extension, ['xlsx', 'xls']);
        if (!$isXlsx && file_exists($filePath)) {
            $h = @fopen($filePath, 'rb');
            if ($h) {
                $bytes = fread($h, 4);
                fclose($h);
                if ($bytes === "PK\x03\x04") {
                    $isXlsx = true;
                }
            }
        }

        if ($isXlsx) {
            $reader = new \OpenSpout\Reader\XLSX\Reader();
            $reader->open($filePath);

            $targetSheet = null;
            $headerMap = [];
            $headerRowIndex = 0;

            $cleanCellStr = function ($val): string {
                if ($val === null) return '';
                if (is_object($val) && method_exists($val, '__toString')) {
                    $val = (string)$val;
                }
                if (!is_string($val)) {
                    $val = (string)$val;
                }
                $val = str_replace(["\xEF\xBB\xBF", "\xFE\xFF", "\xFF\xFE"], '', $val);
                $clean = preg_replace('/[^\x20-\x7E]/', '', $val);
                return strtolower(trim($clean !== null ? $clean : $val));
            };

            foreach ($reader->getSheetIterator() as $sheet) {
                $rIdx = 0;
                foreach ($sheet->getRowIterator() as $row) {
                    $rIdx++;
                    $cells = array_map(fn($cell) => $cleanCellStr($cell->getValue()), $row->getCells());

                    $idxEmpCode = array_search('employee_code', $cells);
                    if ($idxEmpCode === false) $idxEmpCode = array_search('emp_code', $cells);
                    $idxDaysPresent = array_search('days_present', $cells);
                    $idxDaysLOP = array_search('days_lop', $cells);
                    $idxTargetMonth = array_search('target_month', $cells);
                    if ($idxTargetMonth === false) $idxTargetMonth = array_search('month', $cells);

                    if ($idxEmpCode !== false && $idxDaysPresent !== false && $idxDaysLOP !== false) {
                        $targetSheet = $sheet;
                        $headerRowIndex = $rIdx;
                        $headerMap = [
                            'emp_code' => $idxEmpCode,
                            'days_present' => $idxDaysPresent,
                            'days_lop' => $idxDaysLOP,
                            'reason' => array_search('reason', $cells),
                            'target_month' => $idxTargetMonth,
                        ];
                        break 2;
                    }
                }
            }

            if (!$targetSheet || empty($headerMap)) {
                $reader->close();
                throw new \Exception("Missing required headers: employee_code, days_present, days_lop.");
            }

            $curIdx = 0;
            foreach ($targetSheet->getRowIterator() as $row) {
                $curIdx++;
                if ($curIdx <= $headerRowIndex) {
                    continue;
                }

                $cellValues = array_map(fn($c) => (string)($c->getValue() ?? ''), $row->getCells());
                if (empty(array_filter($cellValues))) continue;

                $empCode = isset($cellValues[$headerMap['emp_code']]) ? trim($cellValues[$headerMap['emp_code']]) : '';
                $daysPresent = isset($cellValues[$headerMap['days_present']]) ? trim($cellValues[$headerMap['days_present']]) : '';
                $daysLOP = isset($cellValues[$headerMap['days_lop']]) ? trim($cellValues[$headerMap['days_lop']]) : '';
                $reason = ($headerMap['reason'] !== false && isset($cellValues[$headerMap['reason']])) ? trim($cellValues[$headerMap['reason']]) : '';
                $targetMonth = ($headerMap['target_month'] !== false && isset($cellValues[$headerMap['target_month']])) ? trim($cellValues[$headerMap['target_month']]) : '';

                if (empty($empCode)) continue;

                $rawRows[] = [
                    'employee_code' => $empCode,
                    'days_present' => $daysPresent,
                    'days_lop' => $daysLOP,
                    'reason' => $reason,
                    'target_month' => $targetMonth,
                ];
            }
            $reader->close();
        } else {
            $handle = fopen($filePath, 'r');
            if (!$handle) {
                throw new \Exception("Failed to open CSV file.");
            }
            $headers = fgetcsv($handle);
            if (!$headers) {
                if (is_resource($handle)) { @fclose($handle); }
                throw new \Exception("Empty CSV file.");
            }
            $headers = array_map(function ($h) {
                return strtolower(trim(preg_replace('/[\x{FEFF}\x{FFFE}]/u', '', $h)));
            }, $headers);

            $idxEmpCode = array_search('employee_code', $headers);
            if ($idxEmpCode === false) $idxEmpCode = array_search('emp_code', $headers);
            $idxDaysPresent = array_search('days_present', $headers);
            $idxDaysLOP = array_search('days_lop', $headers);
            $idxReason = array_search('reason', $headers);
            $idxTargetMonth = array_search('target_month', $headers);
            if ($idxTargetMonth === false) $idxTargetMonth = array_search('month', $headers);

            if ($idxEmpCode === false || $idxDaysPresent === false || $idxDaysLOP === false) {
                if (is_resource($handle)) { @fclose($handle); }
                throw new \Exception("Missing required headers: employee_code, days_present, days_lop.");
            }

            while (($data = fgetcsv($handle)) !== false) {
                if (empty(array_filter($data))) continue;
                $rawRows[] = [
                    'employee_code' => isset($data[$idxEmpCode]) ? trim($data[$idxEmpCode]) : '',
                    'days_present' => isset($data[$idxDaysPresent]) ? trim($data[$idxDaysPresent]) : '',
                    'days_lop' => isset($data[$idxDaysLOP]) ? trim($data[$idxDaysLOP]) : '',
                    'reason' => ($idxReason !== false && isset($data[$idxReason])) ? trim($data[$idxReason]) : '',
                    'target_month' => ($idxTargetMonth !== false && isset($data[$idxTargetMonth])) ? trim($data[$idxTargetMonth]) : '',
                ];
            }
            if (is_resource($handle)) { @fclose($handle); }
        }

        $parsedRows = [];
        foreach ($rawRows as $row) {
            if (empty($row['employee_code'])) continue;

            if (!empty($row['target_month'])) {
                $rowMonthShort = substr($row['target_month'], 0, 7);
                $parentMonthShort = substr($parentRun->payroll_month, 0, 7);
                if ($rowMonthShort !== $parentMonthShort) {
                    throw new \Exception("Target month mismatch for employee {$row['employee_code']}: file specifies '{$row['target_month']}', but parent run target month is '{$parentRun->payroll_month}'.");
                }
            }

            $employee = Employee::where('client_id', $parentRun->client_id)
                ->where('employee_code', $row['employee_code'])
                ->first();

            if (!$employee) continue;

            $preview = $this->calculateCorrectionPreview(
                $employee,
                $parentRun,
                (float)$row['days_present'],
                (float)$row['days_lop']
            );

            $parsedRows[] = array_merge($preview, [
                'reason' => $row['reason'] ?: null,
            ]);
        }

        return $parsedRows;
    }

    /**
     * Calculate batch preview across multiple/all employees for a parent run.
     */
    public function calculateBatchPreview(PayrollRun $parentRun, array $selectedEmployeeIds = [], array $daysOverrides = []): array
    {
        $patternContext = $this->detectSystemicPatterns($parentRun);

        $allRunIds = $parentRun->children()->pluck('id')->prepend($parentRun->id)->toArray();

        $rawItems = DB::table('payroll_run_items')
            ->whereIn('payroll_run_id', $allRunIds)
            ->get();

        $consolidated = $this->consolidateItemsForDisplay($rawItems)
            ->where('is_excluded', false);

        if (!empty($selectedEmployeeIds)) {
            $consolidated = $consolidated->whereIn('employee_id', $selectedEmployeeIds);
        }

        $previewItems = [];

        foreach ($consolidated as $item) {
            $employee = Employee::find($item->employee_id);
            if (!$employee) continue;

            $override = $daysOverrides[$employee->id] ?? null;
            $correctedPaidDays = $override ? (float)$override['paid_days'] : (float)$item->paid_days;
            $correctedLopDays = $override ? (float)$override['lop_days'] : (float)$item->lop_days;

            $preview = $this->calculateCorrectionPreview($employee, $parentRun, $correctedPaidDays, $correctedLopDays);

            $currentNet = (float)$item->net_pay;
            $targetNet = (float)$preview['corrected']['net_pay'];
            $netVariance = round($targetNet - $currentNet, 2);

            $preview['delta']['net_pay'] = $netVariance;

            $previewItems[] = array_merge($preview, [
                'current_effective' => [
                    'paid_days' => (float)$item->paid_days,
                    'lop_days' => (float)$item->lop_days,
                    'net_pay' => $currentNet,
                ],
                'net_variance' => $netVariance,
                'reason' => $override['reason'] ?? null,
            ]);
        }

        return [
            'pattern_context' => $patternContext,
            'items' => $previewItems,
        ];
    }

    /**
     * Consolidate payroll run items across parent and child supplementary runs for display/preview.
     */
    public function consolidateItemsForDisplay(\Illuminate\Support\Collection $rawItems): \Illuminate\Support\Collection
    {
        $numericFields = [
            'paid_days', 'lop_days', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions',
            'gross_total', 'employee_pf', 'employee_esi', 'professional_tax', 'pt_shortfall_recovery',
            'lwf_deduction', 'lop_deduction', 'tds_deduction', 'loan_emi_deduction',
            'net_pay', 'employer_pf', 'employer_esi', 'employer_lwf'
        ];

        return $rawItems->groupBy('employee_id')->map(function ($empItems) use ($numericFields) {
            if ($empItems->count() === 1) {
                $baseItem = clone $empItems->first();
            } else {
                $baseItems = $empItems->filter(fn($i) => !($i->is_correction ?? false));
                $correctionItems = $empItems->filter(fn($i) => (bool)($i->is_correction ?? false));

                $baseItem = clone ($baseItems->first() ?? $empItems->first());

                foreach ($numericFields as $field) {
                    $baseItem->$field = round((float)$baseItems->sum($field), 2);
                }

                if ($correctionItems->isNotEmpty()) {
                    $latestCorrections = $correctionItems->groupBy(function ($item) {
                        return $item->original_payroll_run_item_id ?? ('emp_' . $item->employee_id);
                    })->map(function ($group) {
                        return $group->sortByDesc(fn($i) => ($i->created_at ?? '') . '_' . sprintf('%010d', $i->id))->first();
                    });

                    foreach ($latestCorrections as $corr) {
                        foreach ($numericFields as $field) {
                            $baseItem->$field = round((float)$baseItem->$field + (float)($corr->$field ?? 0), 2);
                        }
                    }
                }

                $latestOverall = $empItems->sortByDesc(fn($i) => ($i->created_at ?? '') . '_' . sprintf('%010d', $i->id))->first();
                if ($latestOverall) {
                    $baseItem->warning_notes = $latestOverall->warning_notes ?? null;
                    $baseItem->exclusion_reason = $latestOverall->exclusion_reason ?? null;
                }

                if ($empItems->pluck('is_excluded')->contains(0)) {
                    $baseItem->is_excluded = 0;
                    $baseItem->exclusion_reason = null;
                }
            }

            $baseItem->ctc_display = round((float)($baseItem->gross_total ?? 0) + (float)($baseItem->employer_pf ?? 0) + (float)($baseItem->employer_esi ?? 0) + (float)($baseItem->employer_lwf ?? 0), 2);

            return $baseItem;
        })->values();
    }

    /**
     * Apply single-employee correction into a DRAFT supplementary run.
     */
    public function applyCorrection(
        Employee $employee,
        PayrollRun $parentRun,
        array $previewData,
        string $reason,
        ?int $queryId = null
    ): PayrollRunItem {
        $allRunIds = $parentRun->children()->pluck('id')->prepend($parentRun->id)->toArray();

        $originalItem = DB::table('payroll_run_items')
            ->whereIn('payroll_run_id', $allRunIds)
            ->where('employee_id', $employee->id)
            ->where(function ($q) {
                $q->where('is_correction', false)
                  ->orWhereNull('is_correction');
            })
            ->orderBy('id', 'asc')
            ->first();

        if (!$originalItem) {
            throw new \Exception("Original payroll run item not found.");
        }

        return DB::transaction(function () use ($employee, $parentRun, $previewData, $reason, $queryId, $originalItem) {
            // Find or create DRAFT supplementary run
            $suppRun = PayrollRun::where('parent_run_id', $parentRun->id)
                ->where('status', 'draft')
                ->first();

            if (!$suppRun) {
                $suppRun = PayrollRun::create([
                    'client_id' => $parentRun->client_id,
                    'payroll_month' => $parentRun->payroll_month,
                    'parent_run_id' => $parentRun->id,
                    'status' => 'draft',
                    'total_employees_processed' => 0,
                    'total_employees_excluded' => 0,
                    'total_gross_earnings' => 0.00,
                    'total_net_disbursement' => 0.00,
                    'total_employer_statutory_cost' => 0.00,
                    'created_by' => \Illuminate\Support\Facades\Auth::id(),
                    'updated_by' => \Illuminate\Support\Facades\Auth::id(),
                ]);
            }

            $delta = $previewData['delta'];

            // Collision Scoping: Match existing item in draft supplementary run strictly by employee_id + is_correction=true
            $existingItem = PayrollRunItem::where('payroll_run_id', $suppRun->id)
                ->where('employee_id', $employee->id)
                ->where('is_correction', true)
                ->first();

            $itemData = [
                'payroll_run_id' => $suppRun->id,
                'employee_id' => $employee->id,
                'paid_days' => $delta['paid_days'],
                'lop_days' => $delta['lop_days'],
                'basic_pay' => $delta['basic_pay'],
                'hra' => $delta['hra'],
                'conveyance' => $delta['conveyance'],
                'da' => $delta['da'],
                'medical_allowance' => $delta['medical_allowance'],
                'special_allowance' => $delta['special_allowance'],
                'other_additions' => $delta['other_additions'],
                'gross_total' => $delta['gross_total'],
                'employee_pf' => $delta['employee_pf'],
                'employee_esi' => $delta['employee_esi'],
                'professional_tax' => $delta['professional_tax'],
                'lwf_deduction' => $delta['lwf_deduction'],
                'lop_deduction' => $delta['lop_deduction'],
                'tds_deduction' => $delta['tds_deduction'],
                'loan_emi_deduction' => $delta['loan_emi_deduction'],
                'net_pay' => $delta['net_pay'],
                'employer_pf' => $delta['employer_pf'],
                'employer_epf' => $delta['employer_epf'] ?? 0.00,
                'employer_eps' => $delta['employer_eps'] ?? 0.00,
                'employer_esi' => $delta['employer_esi'],
                'employer_lwf' => $delta['employer_lwf'] ?? 0.00,
                'deferred_loan_amount' => $delta['deferred_loan_amount'] ?? 0.00,
                'is_excluded' => false,
                'exclusion_reason' => null,
                'attendance_source' => $originalItem->attendance_source ?? 'live_punch',
                'salary_revision_applied' => (bool)$originalItem->salary_revision_applied,
                'is_correction' => true,
                'correction_reason' => $reason,
                'original_payroll_run_item_id' => $originalItem->id,
                'employee_query_id' => $queryId,
                'created_by' => \Illuminate\Support\Facades\Auth::id(),
                'updated_by' => \Illuminate\Support\Facades\Auth::id(),
            ];

            if ($existingItem) {
                $existingItem->update($itemData);
                $savedItem = $existingItem;
            } else {
                $savedItem = PayrollRunItem::create($itemData);
            }

            // Explicit Query Link: Mark query in_progress at draft creation time (do NOT set resolved until locked)
            if ($queryId) {
                $query = EmployeeQuery::find($queryId);
                if ($query) {
                    $query->update([
                        'status' => 'in_progress',
                        'admin_response' => "Payroll adjustment created in draft supplementary run: {$reason}",
                        'correction_run_item_id' => $savedItem->id,
                    ]);
                }
            }

            $this->recalculateSupplementaryRunTotals($suppRun);

            return $savedItem;
        });
    }

    /**
     * Apply batch correction for multiple employees into a single DRAFT supplementary run.
     */
    public function applyBatchCorrection(PayrollRun $parentRun, array $itemsPayload, string $defaultReason): PayrollRun
    {
        $clientModel = $parentRun->client ?? \App\Models\Client::find($parentRun->client_id);
        if ($clientModel) {
            app(PayrollCycleWarningService::class)->ensureCycleEnded($clientModel, $parentRun->payroll_month);
        }

        return DB::transaction(function () use ($parentRun, $itemsPayload, $defaultReason) {
            $suppRun = PayrollRun::where('parent_run_id', $parentRun->id)
                ->where('status', 'draft')
                ->first();

            if (!$suppRun) {
                $suppRun = PayrollRun::create([
                    'client_id' => $parentRun->client_id,
                    'payroll_month' => $parentRun->payroll_month,
                    'parent_run_id' => $parentRun->id,
                    'status' => 'draft',
                    'total_employees_processed' => 0,
                    'total_employees_excluded' => 0,
                    'total_gross_earnings' => 0.00,
                    'total_net_disbursement' => 0.00,
                    'total_employer_statutory_cost' => 0.00,
                    'created_by' => \Illuminate\Support\Facades\Auth::id(),
                    'updated_by' => \Illuminate\Support\Facades\Auth::id(),
                ]);
            }

            foreach ($itemsPayload as $itemPayload) {
                $employee = Employee::findOrFail($itemPayload['employee_id']);
                $correctedPaidDays = (float)$itemPayload['corrected_paid_days'];
                $correctedLopDays = (float)$itemPayload['corrected_lop_days'];
                $reason = !empty($itemPayload['reason']) ? $itemPayload['reason'] : $defaultReason;
                $queryId = !empty($itemPayload['employee_query_id']) ? (int)$itemPayload['employee_query_id'] : null;

                // Live re-validation inside transaction
                $previewData = $this->calculateCorrectionPreview(
                    $employee,
                    $parentRun,
                    $correctedPaidDays,
                    $correctedLopDays
                );

                $allRunIds = $parentRun->children()->pluck('id')->prepend($parentRun->id)->toArray();

                $originalItem = DB::table('payroll_run_items')
                    ->whereIn('payroll_run_id', $allRunIds)
                    ->where('employee_id', $employee->id)
                    ->where(function ($q) {
                        $q->where('is_correction', false)
                          ->orWhereNull('is_correction');
                    })
                    ->orderBy('id', 'asc')
                    ->first();

                $delta = $previewData['delta'];

                $existingItem = PayrollRunItem::where('payroll_run_id', $suppRun->id)
                    ->where('employee_id', $employee->id)
                    ->where('is_correction', true)
                    ->first();

                $itemData = [
                    'payroll_run_id' => $suppRun->id,
                    'employee_id' => $employee->id,
                    'paid_days' => $delta['paid_days'],
                    'lop_days' => $delta['lop_days'],
                    'basic_pay' => $delta['basic_pay'],
                    'hra' => $delta['hra'],
                    'conveyance' => $delta['conveyance'],
                    'da' => $delta['da'],
                    'medical_allowance' => $delta['medical_allowance'],
                    'special_allowance' => $delta['special_allowance'],
                    'other_additions' => $delta['other_additions'],
                    'gross_total' => $delta['gross_total'],
                    'employee_pf' => $delta['employee_pf'],
                    'employee_esi' => $delta['employee_esi'],
                    'professional_tax' => $delta['professional_tax'],
                    'lwf_deduction' => $delta['lwf_deduction'],
                    'lop_deduction' => $delta['lop_deduction'],
                    'tds_deduction' => $delta['tds_deduction'],
                    'loan_emi_deduction' => $delta['loan_emi_deduction'],
                    'net_pay' => $delta['net_pay'],
                    'employer_pf' => $delta['employer_pf'],
                    'employer_epf' => $delta['employer_epf'] ?? 0.00,
                    'employer_eps' => $delta['employer_eps'] ?? 0.00,
                    'employer_esi' => $delta['employer_esi'],
                    'employer_lwf' => $delta['employer_lwf'] ?? 0.00,
                    'deferred_loan_amount' => $delta['deferred_loan_amount'] ?? 0.00,
                    'is_excluded' => false,
                    'exclusion_reason' => null,
                    'attendance_source' => $originalItem->attendance_source ?? 'live_punch',
                    'salary_revision_applied' => (bool)$originalItem->salary_revision_applied,
                    'is_correction' => true,
                    'correction_reason' => $reason,
                    'original_payroll_run_item_id' => $originalItem->id,
                    'employee_query_id' => $queryId,
                    'created_by' => \Illuminate\Support\Facades\Auth::id(),
                    'updated_by' => \Illuminate\Support\Facades\Auth::id(),
                ];

                if ($existingItem) {
                    $existingItem->update($itemData);
                    $savedItem = $existingItem;
                } else {
                    $savedItem = PayrollRunItem::create($itemData);
                }

                if ($queryId) {
                    $query = EmployeeQuery::find($queryId);
                    if ($query) {
                        $query->update([
                            'status' => 'in_progress',
                            'admin_response' => "Payroll adjustment created in draft supplementary run: {$reason}",
                            'correction_run_item_id' => $savedItem->id,
                        ]);
                    }
                }
            }

            $this->recalculateSupplementaryRunTotals($suppRun);

            return $suppRun;
        });
    }

    /**
     * Recalculate combined stats on a supplementary run model.
     */
    protected function recalculateSupplementaryRunTotals(PayrollRun $suppRun): void
    {
        $items = PayrollRunItem::where('payroll_run_id', $suppRun->id)->get();

        $processed = $items->where('is_excluded', false)->count();
        $excluded = $items->where('is_excluded', true)->count();
        $gross = $items->where('is_excluded', false)->sum('gross_total');
        $net = $items->where('is_excluded', false)->sum('net_pay');
        $statutory = $items->where('is_excluded', false)->sum(fn($i) => $i->employer_pf + $i->employer_esi + $i->employer_lwf);

        // Update bypassing status guard if run is draft
        DB::table('payroll_runs')->where('id', $suppRun->id)->update([
            'total_employees_processed' => $processed,
            'total_employees_excluded' => $excluded,
            'total_gross_earnings' => round($gross, 2),
            'total_net_disbursement' => round($net, 2),
            'total_employer_statutory_cost' => round($statutory, 2),
            'updated_at' => now(),
        ]);
    }
}
