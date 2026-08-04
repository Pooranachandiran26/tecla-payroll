<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Spatie\SimpleExcel\SimpleExcelReader;

class AttendanceUploadValidationService
{
    /**
     * Parse and validate a monthly-summary attendance CSV file for a target client and month.
     *
     * CSV format: employee_code,days_present,days_lop
     * One row per employee for the whole target month.
     *
     * @param string $filePath
     * @param int $clientId
     * @param string $targetMonth  Format: 'YYYY-MM'
     * @return array
     */
    public function validateFile(string $filePath, int $clientId, string $targetMonth, ?string $batchId = null): array
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
                            'target_month' => $idxTargetMonth,
                        ];
                        break 2;
                    }
                }
            }

            if (!$targetSheet || empty($headerMap)) {
                $reader->close();
                throw new \Exception("Missing required headers. Headers must include: employee_code, days_present, days_lop.");
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
                $tMonth = ($headerMap['target_month'] !== false && isset($cellValues[$headerMap['target_month']])) ? trim($cellValues[$headerMap['target_month']]) : '';

                if (empty($empCode)) continue;

                $rawRows[] = [
                    'employee_code' => $empCode,
                    'days_present' => $daysPresent,
                    'days_lop' => $daysLOP,
                    'target_month' => $tMonth,
                ];
            }
            $reader->close();
        } else {
            // CSV parsing
            $handle = fopen($filePath, 'r');
            if (!$handle) {
                throw new \Exception("Failed to open file handler.");
            }

            $headers = fgetcsv($handle);
            if (!$headers) {
                if (is_resource($handle)) { @fclose($handle); }
                throw new \Exception("Empty CSV file.");
            }

            $headers = array_map(function ($h) {
                $h = preg_replace('/[\x{FEFF}\x{FFFE}]/u', '', $h);
                return strtolower(trim($h));
            }, $headers);

            $idxEmpCode = array_search('employee_code', $headers);
            if ($idxEmpCode === false) $idxEmpCode = array_search('emp_code', $headers);
            $idxDaysPresent = array_search('days_present', $headers);
            $idxDaysLOP = array_search('days_lop', $headers);
            $idxTargetMonth = array_search('target_month', $headers);
            if ($idxTargetMonth === false) $idxTargetMonth = array_search('month', $headers);

            if ($idxEmpCode === false || $idxDaysPresent === false || $idxDaysLOP === false) {
                if (is_resource($handle)) { @fclose($handle); }
                throw new \Exception("Missing required headers. Headers must include: employee_code, days_present, days_lop.");
            }

            while (($data = fgetcsv($handle)) !== false) {
                if (empty(array_filter($data)) || (isset($data[0]) && str_starts_with(trim($data[0]), '#'))) {
                    continue;
                }

                $rawRows[] = [
                    'employee_code' => isset($data[$idxEmpCode]) ? trim($data[$idxEmpCode]) : '',
                    'days_present' => isset($data[$idxDaysPresent]) ? trim($data[$idxDaysPresent]) : '',
                    'days_lop' => isset($data[$idxDaysLOP]) ? trim($data[$idxDaysLOP]) : '',
                    'target_month' => ($idxTargetMonth !== false && isset($data[$idxTargetMonth])) ? trim($data[$idxTargetMonth]) : '',
                ];
            }
            if (is_resource($handle)) { @fclose($handle); }
        }

        // Compute working days for the target month using the client's weekly off pattern and holidays
        $monthStart = Carbon::parse($targetMonth . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();
        $clientModel = Client::find($clientId);

        $clientHolidayDates = Holiday::where('client_id', $clientId)
            ->whereBetween('holiday_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $clientOffDays = $this->resolveOffDays(null, $clientModel);
        $allWeekdays = $this->getWeekdaysInRange($monthStart, $monthEnd, $clientOffDays, $clientHolidayDates);
        $totalWorkingDays = count($allWeekdays);

        // Bulk load all employees for this client using fast DB query (avoiding Eloquent overhead)
        $employees = DB::table('employees')
            ->where('client_id', $clientId)
            ->select('id', 'employee_code', 'full_name', 'date_of_joining', 'attendance_tracking_start_date', 'weekly_off_pattern')
            ->get();
        $employeesMap = $employees->keyBy('employee_code');

        // Bulk load locked payroll run items for this client and month in 1 query
        $lockedEmployeeIds = DB::table('payroll_run_items')
            ->join('payroll_runs', 'payroll_run_items.payroll_run_id', '=', 'payroll_runs.id')
            ->where('payroll_runs.client_id', $clientId)
            ->where('payroll_runs.payroll_month', $monthStart->toDateString())
            ->where('payroll_runs.status', 'locked')
            ->whereIn('payroll_run_items.employee_id', $employees->pluck('id'))
            ->pluck('payroll_run_items.employee_id')
            ->flip()
            ->toArray();

        // Bulk load existing live punches for all employees in 1 query
        $existingPunchesMap = AttendanceRecord::whereIn('employee_id', $employees->pluck('id'))
            ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->whereIn('source', ['live_punch', 'override'])
            ->select('employee_id', DB::raw('count(*) as count'))
            ->groupBy('employee_id')
            ->pluck('count', 'employee_id')
            ->toArray();

        $rows = [];
        $stagingChunks = [];
        $now = now()->toDateTimeString();
        $totalRows = 0;
        $matchedRows = 0;
        $skippedCount = 0;
        $errorCount = 0;
        $rowNo = 1;

        foreach ($rawRows as $item) {
            $rowNo++;
            $totalRows++;

            $rawEmpCode = $item['employee_code'];
            $rawDaysPresent = $item['days_present'];
            $rawDaysLOP = $item['days_lop'];
            $rawTargetMonth = $item['target_month'];

            $monthMismatchNote = '';
            if (!empty($rawTargetMonth)) {
                try {
                    $parsedSheetMonth = Carbon::parse($rawTargetMonth . (strlen($rawTargetMonth) === 7 ? '-01' : ''))->format('Y-m');
                    if ($parsedSheetMonth !== $targetMonth) {
                        $sheetMonthLabel = Carbon::parse($parsedSheetMonth . '-01')->format('F Y');
                        $selectedMonthLabel = Carbon::parse($targetMonth . '-01')->format('F Y');
                        $monthMismatchNote = "⚠️ Target month mismatch — sheet specifies '{$sheetMonthLabel}', but '{$selectedMonthLabel}' was selected on this page. Proceeding with {$selectedMonthLabel} — please double-check this is correct.";
                    }
                } catch (\Exception $e) {
                    // Ignore unparseable rawTargetMonth
                }
            }

            $employee = null;
            $matchedName = 'Unmatched / Not Found';
            $matchType = 'none';
            $status = 'invalid';
            $notes = '';
            $dbPayloads = [];

            // 1. Look up employee strictly scoped to the target client using in-memory map
            if (!empty($rawEmpCode)) {
                $employee = $employeesMap->get($rawEmpCode);

                if ($employee) {
                    $matchedName = "{$employee->full_name} ({$employee->employee_code})";
                    $matchType = 'exact';
                }
            }

            // 2. Validate row parameters if employee matched
            if ($employee) {
                // 2a. Check if employee already has a LOCKED payroll_run_item for this month
                $hasLockedItem = isset($lockedEmployeeIds[$employee->id]);

                if ($hasLockedItem) {
                    $monthLabel = $monthStart->format('F Y');
                    $status = 'blocked_locked';
                    $notes = "⚠️ Payroll for {$monthLabel} is already locked for {$employee->employee_code}. Use Payroll Correction instead of re-uploading attendance.";
                    $errorCount++;
                } else
                // Parse days as non-negative integers
                if (!is_numeric($rawDaysPresent) || (int) $rawDaysPresent < 0) {
                    $notes = "Invalid days_present: '{$rawDaysPresent}'. Must be a non-negative integer.";
                    $errorCount++;
                } elseif (!is_numeric($rawDaysLOP) || (int) $rawDaysLOP < 0) {
                    $notes = "Invalid days_lop: '{$rawDaysLOP}'. Must be a non-negative integer.";
                    $errorCount++;
                } else {
                    $daysPresent = (int) $rawDaysPresent;
                    $daysLOP = (int) $rawDaysLOP;

                    // Bound working days by the employee's date_of_joining and attendance_tracking_start_date (if set)
                    $employeeStart = Carbon::parse($employee->date_of_joining)->startOfDay();
                    if (!empty($employee->attendance_tracking_start_date)) {
                        $atsd = Carbon::parse($employee->attendance_tracking_start_date)->startOfDay();
                        if ($atsd->gt($employeeStart)) {
                            $employeeStart = $atsd->copy();
                        }
                    }
                    $empOffDays = $this->resolveOffDays($employee, $clientModel);
                    $effectiveStart = $monthStart->gt($employeeStart) ? $monthStart->copy() : $employeeStart->copy();
                    $isMidMonth = $employeeStart->gt($monthStart) && $employeeStart->lte($monthEnd);
                    $hasCustomPattern = (!empty($employee->weekly_off_pattern) && strtolower($employee->weekly_off_pattern) !== strtolower($clientModel->weekly_off_pattern ?? 'sat,sun'));
                    $hasPunches = isset($existingPunchesMap[$employee->id]);

                    if ($isMidMonth || $hasCustomPattern || $hasPunches) {
                        $context = $this->calculateWorkingDaysContext($clientId, $targetMonth, $employee);
                        $employeeWorkingDays = $context['working_days_slots'];
                        $availableSlots = $context['net_available_slots'];
                        $monthLabel = $context['month_label'];
                    } else {
                        $employeeWorkingDays = $totalWorkingDays;
                        $availableSlots = $totalWorkingDays;
                        $monthLabel = $monthStart->format('F Y');
                    }

                    $uploadedTotal = $daysPresent + $daysLOP;
                    $isNotYetEmployed = $employeeStart->gt($monthEnd);
                    $dojFormatted = Carbon::parse($employee->date_of_joining)->format('F d, Y');

                    if ($isNotYetEmployed) {
                        $status = 'skipped';
                        $skippedCount++;
                        $reconciledPresent = 0;
                        $reconciledLop = 0;
                        $notes = "⚠️ Not yet joined — {$employee->employee_code} joined {$dojFormatted}. No attendance recorded for {$monthLabel}.";
                        $dbPayloads = [];
                    } elseif ($uploadedTotal === $availableSlots) {
                        // Perfect match
                        $status = 'valid';
                        $matchedRows++;
                        $reconciledPresent = $daysPresent;
                        $reconciledLop = $daysLOP;
                        $notes = "";
                    } elseif ($uploadedTotal < $availableSlots) {
                        // Shortfall - auto reconcile
                        $status = 'valid';
                        $matchedRows++;
                        $reconciledPresent = $daysPresent;
                        $reconciledLop = $availableSlots - $daysPresent;
                        $notes = "Warning: Shortfall. Uploaded: {$daysPresent} present / {$daysLOP} LOP. Saved: {$reconciledPresent} present / {$reconciledLop} LOP (due to unfilled slots).";
                    } else {
                        // Over-count
                        $scheduleReason = "";
                        if (!empty($employee->weekly_off_pattern)) {
                            $scheduleReason = " (due to employee's custom weekly off schedule: " . strtoupper($context['off_days_label']) . " off = {$context['off_days_count']} off-days)";
                        } elseif ($effectiveStart->gt($monthStart)) {
                            $scheduleReason = " (due to mid-month joining / tracking start on " . $effectiveStart->format('M d, Y') . ")";
                        }

                        if ($daysLOP > 0) {
                            // Reject over-count with LOP
                            $notes = "⚠️ Numbers don't match — you entered {$uploadedTotal} days total, but this month only has {$availableSlots} working days{$scheduleReason}. Please fix and re-upload.";
                            $errorCount++;
                        } else {
                            // Cap present days if LOP is 0
                            $status = 'valid';
                            $matchedRows++;
                            $reconciledPresent = $availableSlots;
                            $reconciledLop = 0;
                            $notes = "⚠️ Adjusted — you entered {$daysPresent} present days, but this month only has {$availableSlots}{$scheduleReason}. We've automatically capped it to {$availableSlots}.";
                        }
                    }
                }
            } else {
                $notes = "Employee code '{$rawEmpCode}' not found for this client.";
                $errorCount++;
            }

            if (!empty($monthMismatchNote)) {
                $notes = empty($notes) ? $monthMismatchNote : ($monthMismatchNote . " " . $notes);
            }

            // Only accumulate error/skipped rows for frontend display
            if ($status !== 'valid') {
                $rows[] = [
                    'id' => $rowNo,
                    'empCode' => $rawEmpCode,
                    'matchedName' => $matchedName,
                    'matchType' => $matchType,
                    'daysPresent' => is_numeric($rawDaysPresent) ? (int) $rawDaysPresent : $rawDaysPresent,
                    'daysLOP' => is_numeric($rawDaysLOP) ? (int) $rawDaysLOP : $rawDaysLOP,
                    'status' => $status,
                    'notes' => $notes,
                ];
            }

            if ($batchId) {
                $stagingChunks[] = [
                    'batch_id' => $batchId,
                    'employee_code' => $rawEmpCode,
                    'full_name' => $employee ? $employee->full_name : null,
                    'days_present' => isset($reconciledPresent) ? (float)$reconciledPresent : (is_numeric($rawDaysPresent) ? (float)$rawDaysPresent : 0.00),
                    'days_lop' => isset($reconciledLop) ? (float)$reconciledLop : (is_numeric($rawDaysLOP) ? (float)$rawDaysLOP : 0.00),
                    'status' => ($status === 'valid' || $status === 'skipped') ? 'ready' : 'error',
                    'error_message' => $notes ?: null,
                    'client_id' => $clientId,
                    'db_payloads' => '[]',
                    'raw_data' => json_encode($item),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($batchId && !empty($stagingChunks)) {
            DB::table('attendance_upload_staging_rows')->where('batch_id', $batchId)->delete();
            foreach (array_chunk($stagingChunks, 500) as $chunk) {
                DB::table('attendance_upload_staging_rows')->insert($chunk);
            }
        }

        return [
            'rows' => $rows,
            'total_rows' => $totalRows,
            'matched_rows' => $matchedRows,
            'skipped_count' => $skippedCount,
            'error_count' => $errorCount,
        ];
    }

    /**
     * Expand a monthly summary into daily attendance_records payloads.
     *
     * Deterministic rule: fill the first N available weekdays as 'present',
     * then fill remaining available weekdays as 'absent' (LOP).
     * Skip any dates that already have live_punch/override records.
     *
     * @param int $employeeId
     * @param int $daysPresent
     * @param int $daysLOP
     * @param Carbon $monthStart
     * @param Carbon $monthEnd
     * @param array $offDays
     * @param array $holidayDates
     * @return array
     */
    public function expandToDaily(int $employeeId, int $daysPresent, int $daysLOP, Carbon $monthStart, Carbon $monthEnd, array $offDays = ['sat', 'sun'], array $holidayDates = [], array $existingPunchDates = []): array
    {
        // Get all working day dates in the month (using weekly off pattern and holidays)
        $allWeekdays = $this->getWeekdaysInRange($monthStart, $monthEnd, $offDays, $holidayDates);

        // Filter to only available (unfilled) weekdays
        $availableWeekdays = array_values(array_filter($allWeekdays, function ($dateStr) use ($existingPunchDates) {
            return !in_array($dateStr, $existingPunchDates);
        }));

        $payloads = [];
        $presentFilled = 0;

        foreach ($availableWeekdays as $dateStr) {
            if ($presentFilled < $daysPresent) {
                $payloads[] = [
                    'employee_id' => $employeeId,
                    'attendance_date' => $dateStr,
                    'status' => 'present',
                    'source' => 'uploaded',
                    'notes' => 'Uploaded via bulk timesheet (monthly summary)',
                ];
                $presentFilled++;
            } else {
                // Remaining slots are LOP/absent
                $payloads[] = [
                    'employee_id' => $employeeId,
                    'attendance_date' => $dateStr,
                    'status' => 'absent',
                    'source' => 'uploaded',
                    'notes' => 'Uploaded via bulk timesheet (monthly summary)',
                ];
            }
        }

        return $payloads;
    }

    /**
     * Get all working day date strings in a date range, inclusive.
     * Days matching the off-day pattern or holiday dates are excluded.
     *
     * @param Carbon $start
     * @param Carbon $end
     * @param array $offDays  Lowercase 3-letter day abbreviations (e.g. ['sat', 'sun'])
     * @param array $holidayDates  Array of 'Y-m-d' date strings
     * @return array  Array of 'Y-m-d' strings
     */
    private function getWeekdaysInRange(Carbon $start, Carbon $end, array $offDays = ['sat', 'sun'], array $holidayDates = []): array
    {
        $weekdays = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $dateStr = $date->toDateString();
            $dayName = strtolower($date->format('D'));
            if (!in_array($dayName, $offDays) && !in_array($dateStr, $holidayDates)) {
                $weekdays[] = $dateStr;
            }
        }
        return $weekdays;
    }

    /**
     * Resolve the effective weekly off days array for an employee/client.
     *
     * @param Employee|null $employee
     * @param Client|null $client
     * @return array  Lowercase 3-letter day abbreviations (e.g. ['sat', 'sun'])
     */
    private function resolveOffDays(mixed $employee, ?Client $client): array
    {
        $pattern = (is_object($employee) ? ($employee->weekly_off_pattern ?? null) : null)
            ?? $client?->weekly_off_pattern
            ?? 'sat,sun';
        return array_map('trim', explode(',', strtolower($pattern)));
    }

    /**
     * Single Source of Truth for working days slots & calendar context for a client and target month.
     * Called by both UI getContext endpoint and file validation logic.
     *
     * @param int $clientId
     * @param string $targetMonth Format: 'YYYY-MM'
     * @param Employee|null $employee
     * @return array
     */
    public function calculateWorkingDaysContext(int $clientId, string $targetMonth, mixed $employee = null): array
    {
        $monthStart = Carbon::parse($targetMonth . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();
        $totalCalendarDays = $monthStart->daysInMonth;

        $clientModel = Client::find($clientId);
        $clientName = $clientModel ? $clientModel->company_name : 'Client';

        $empOffDays = $this->resolveOffDays($employee, $clientModel);

        $empPattern = is_object($employee) ? ($employee->weekly_off_pattern ?? null) : null;
        $patternStr = strtolower($empPattern ?? $clientModel?->weekly_off_pattern ?? 'sat,sun');
        $dayNamesMap = [
            'mon' => 'Monday',
            'tue' => 'Tuesday',
            'wed' => 'Wednesday',
            'thu' => 'Thursday',
            'fri' => 'Friday',
            'sat' => 'Saturday',
            'sun' => 'Sunday',
        ];
        $patternParts = array_filter(explode(',', strtolower($patternStr)));
        $mappedParts = array_map(fn($p) => $dayNamesMap[trim($p)] ?? ucfirst(trim($p)), $patternParts);
        $offDaysLabel = !empty($mappedParts) ? implode(' & ', $mappedParts) : 'None';

        $holidays = Holiday::where('client_id', $clientId)
            ->whereBetween('holiday_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get();

        $holidayDates = $holidays->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $effectiveStart = $monthStart->copy();
        if ($employee) {
            $employeeStart = Carbon::parse($employee->date_of_joining)->startOfDay();
            if (!empty($employee->attendance_tracking_start_date)) {
                $atsd = Carbon::parse($employee->attendance_tracking_start_date)->startOfDay();
                if ($atsd->gt($employeeStart)) {
                    $employeeStart = $atsd->copy();
                }
            }
            if ($employeeStart->gt($effectiveStart)) {
                $effectiveStart = $employeeStart->copy();
            }
        }

        $allWeekdays = $this->getWeekdaysInRange($effectiveStart, $monthEnd, $empOffDays, $holidayDates);
        $workingDaysSlots = count($allWeekdays);

        $offDaysCount = 0;
        for ($date = $monthStart->copy(); $date->lte($monthEnd); $date->addDay()) {
            if (in_array(strtolower($date->format('D')), $empOffDays)) {
                $offDaysCount++;
            }
        }

        $workDayHolidays = $holidays->filter(function ($h) use ($empOffDays) {
            $d = Carbon::parse($h->holiday_date);
            return !in_array(strtolower($d->format('D')), $empOffDays);
        });

        $formattedHolidays = $holidays->map(fn($h) => [
            'date' => Carbon::parse($h->holiday_date)->format('M d, Y'),
            'iso_date' => Carbon::parse($h->holiday_date)->toDateString(),
            'name' => $h->name,
            'is_off_day' => in_array(strtolower(Carbon::parse($h->holiday_date)->format('D')), $empOffDays),
        ])->values()->toArray();

        $cycleEndsFormatted = $clientModel ? $clientModel->getCycleEndDate($monthStart->toDateString())->format('M j, Y') : $monthEnd->format('M j, Y');
        $targetLockDateFormatted = $clientModel ? ($clientModel->getTargetLockDate($monthStart->toDateString()) ?? 'N/A') : 'N/A';
        $targetSalaryCreditFormatted = $clientModel ? ($clientModel->getTargetSalaryCreditDate($monthStart->toDateString()) ?? 'N/A') : 'N/A';

        $existingPunches = 0;
        if ($employee) {
            $existingPunches = AttendanceRecord::where('employee_id', $employee->id)
                ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->whereIn('source', ['live_punch', 'override'])
                ->count();
        }
        $netAvailableSlots = max(0, $workingDaysSlots - $existingPunches);

        return [
            'client_id' => $clientId,
            'client_name' => $clientName,
            'target_month' => $targetMonth,
            'month_label' => $monthStart->format('F Y'),
            'total_calendar_days' => $totalCalendarDays,
            'off_days_pattern' => $patternStr,
            'off_days_label' => $offDaysLabel,
            'off_days_count' => $offDaysCount,
            'holiday_count' => $holidays->count(),
            'workday_holiday_count' => $workDayHolidays->count(),
            'holidays' => $formattedHolidays,
            'working_days_slots' => $workingDaysSlots,
            'existing_punches_count' => $existingPunches,
            'net_available_slots' => $netAvailableSlots,
            'cycle_ends_formatted' => $cycleEndsFormatted,
            'target_lock_date_formatted' => $targetLockDateFormatted,
            'target_salary_credit_formatted' => $targetSalaryCreditFormatted,
        ];
    }
}

