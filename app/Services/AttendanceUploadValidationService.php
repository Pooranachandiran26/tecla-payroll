<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\Holiday;
use Carbon\Carbon;

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
    public function validateFile(string $filePath, int $clientId, string $targetMonth): array
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw new \Exception("File is not readable or does not exist.");
        }

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new \Exception("Failed to open file handler.");
        }

        // Parse header row
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            throw new \Exception("Empty CSV file.");
        }

        // Clean headers: lowercase, trim, remove invisible UTF-8 BOM if present
        $headers = array_map(function ($h) {
            $h = preg_replace('/[\x{FEFF}\x{FFFE}]/u', '', $h);
            return strtolower(trim($h));
        }, $headers);

        // Find column indices
        $idxEmpCode = array_search('employee_code', $headers);
        if ($idxEmpCode === false) $idxEmpCode = array_search('emp_code', $headers);

        $idxDaysPresent = array_search('days_present', $headers);
        $idxDaysLOP = array_search('days_lop', $headers);

        if ($idxEmpCode === false || $idxDaysPresent === false || $idxDaysLOP === false) {
            fclose($handle);
            throw new \Exception("Missing required headers. Headers must include: employee_code, days_present, days_lop.");
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

        $rows = [];
        $totalRows = 0;
        $matchedRows = 0;
        $errorCount = 0;
        $rowNo = 1;

        while (($data = fgetcsv($handle)) !== false) {
            // Skip empty rows
            if (empty(array_filter($data))) {
                continue;
            }

            $rowNo++;
            $totalRows++;

            $rawEmpCode = isset($data[$idxEmpCode]) ? trim($data[$idxEmpCode]) : '';
            $rawDaysPresent = isset($data[$idxDaysPresent]) ? trim($data[$idxDaysPresent]) : '';
            $rawDaysLOP = isset($data[$idxDaysLOP]) ? trim($data[$idxDaysLOP]) : '';

            $employee = null;
            $matchedName = 'Unmatched / Not Found';
            $matchType = 'none';
            $status = 'invalid';
            $notes = '';
            $dbPayloads = [];

            // 1. Look up employee strictly scoped to the target client
            if (!empty($rawEmpCode)) {
                $employee = Employee::where('client_id', $clientId)
                    ->where('employee_code', $rawEmpCode)
                    ->first();

                if ($employee) {
                    $matchedName = "{$employee->full_name} ({$employee->employee_code})";
                    $matchType = 'exact';
                }
            }

            // 2. Validate row parameters if employee matched
            if ($employee) {
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
                    $effectiveStart = $monthStart->gt($employeeStart) ? $monthStart->copy() : $employeeStart->copy();
                    $empOffDays = $this->resolveOffDays($employee, $clientModel);
                    $employeeWeekdays = $this->getWeekdaysInRange($effectiveStart, $monthEnd, $empOffDays, $clientHolidayDates);
                    $employeeWorkingDays = count($employeeWeekdays);

                    // Count existing live_punch/override records for this employee in the target month
                    $existingPunchCount = AttendanceRecord::where('employee_id', $employee->id)
                        ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                        ->whereIn('source', ['live_punch', 'override'])
                        ->count();

                    $availableSlots = $employeeWorkingDays - $existingPunchCount;
                    $uploadedTotal = $daysPresent + $daysLOP;

                    if ($uploadedTotal === $availableSlots) {
                        // Perfect match
                        $status = 'valid';
                        $matchedRows++;
                        $reconciledPresent = $daysPresent;
                        $reconciledLop = $daysLOP;
                        $notes = "";

                        $dbPayloads = $this->expandToDaily(
                            $employee->id,
                            $reconciledPresent,
                            $reconciledLop,
                            $effectiveStart,
                            $monthEnd,
                            $empOffDays,
                            $clientHolidayDates
                        );
                    } elseif ($uploadedTotal < $availableSlots) {
                        // Shortfall - auto reconcile
                        $status = 'valid';
                        $matchedRows++;
                        $reconciledPresent = $daysPresent;
                        $reconciledLop = $availableSlots - $daysPresent;
                        $notes = "Warning: Shortfall. Uploaded: {$daysPresent} present / {$daysLOP} LOP. Saved: {$reconciledPresent} present / {$reconciledLop} LOP (due to unfilled slots).";

                        $dbPayloads = $this->expandToDaily(
                            $employee->id,
                            $reconciledPresent,
                            $reconciledLop,
                            $effectiveStart,
                            $monthEnd,
                            $empOffDays,
                            $clientHolidayDates
                        );
                    } else {
                        // Over-count
                        if ($daysLOP > 0) {
                            // Reject over-count with LOP
                            $notes = "Error: Uploaded total ({$uploadedTotal}) exceeds available slots ({$availableSlots}) with non-zero LOP. Original: {$daysPresent} present / {$daysLOP} LOP. Only {$employeeWorkingDays} weekdays exist in this period, and {$existingPunchCount} are already recorded.";
                            $errorCount++;
                        } else {
                            // Cap present days if LOP is 0
                            $status = 'valid';
                            $matchedRows++;
                            $reconciledPresent = $availableSlots;
                            $reconciledLop = 0;
                            $notes = "Warning: Over-count capped. Uploaded: {$daysPresent} present / 0 LOP. Saved: {$reconciledPresent} present / 0 LOP ({$existingPunchCount} days already recorded via portal punch).";

                            $dbPayloads = $this->expandToDaily(
                                $employee->id,
                                $reconciledPresent,
                                $reconciledLop,
                                $effectiveStart,
                                $monthEnd,
                                $empOffDays,
                                $clientHolidayDates
                            );
                        }
                    }
                }
            } else {
                $notes = "Employee code '{$rawEmpCode}' not found for this client.";
                $errorCount++;
            }

            $rows[] = [
                'id' => $rowNo,
                'empCode' => $rawEmpCode,
                'matchedName' => $matchedName,
                'matchType' => $matchType,
                'daysPresent' => is_numeric($rawDaysPresent) ? (int) $rawDaysPresent : $rawDaysPresent,
                'daysLOP' => is_numeric($rawDaysLOP) ? (int) $rawDaysLOP : $rawDaysLOP,
                'status' => $status,
                'notes' => $notes,
                'db_payloads' => $dbPayloads,
            ];
        }

        fclose($handle);

        return [
            'rows' => $rows,
            'total_rows' => $totalRows,
            'matched_rows' => $matchedRows,
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
    public function expandToDaily(int $employeeId, int $daysPresent, int $daysLOP, Carbon $monthStart, Carbon $monthEnd, array $offDays = ['sat', 'sun'], array $holidayDates = []): array
    {
        // Get all working day dates in the month (using weekly off pattern and holidays)
        $allWeekdays = $this->getWeekdaysInRange($monthStart, $monthEnd, $offDays, $holidayDates);

        // Get dates that already have live_punch/override records
        $existingPunchDates = AttendanceRecord::where('employee_id', $employeeId)
            ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->whereIn('source', ['live_punch', 'override'])
            ->pluck('attendance_date')
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->toArray();

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
    private function resolveOffDays(?Employee $employee, ?Client $client): array
    {
        $pattern = $employee?->weekly_off_pattern
            ?? $client?->weekly_off_pattern
            ?? 'sat,sun';
        return array_map('trim', explode(',', strtolower($pattern)));
    }
}

