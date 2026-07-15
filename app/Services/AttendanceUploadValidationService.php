<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\AttendanceRecord;
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

        // Compute working days for the target month
        $monthStart = Carbon::parse($targetMonth . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();
        $allWeekdays = $this->getWeekdaysInRange($monthStart, $monthEnd);
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

                    // Count existing live_punch/override records for this employee in the target month
                    $existingPunchCount = AttendanceRecord::where('employee_id', $employee->id)
                        ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                        ->whereIn('source', ['live_punch', 'override'])
                        ->count();

                    $availableSlots = $totalWorkingDays - $existingPunchCount;
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
                            $monthStart,
                            $monthEnd
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
                            $monthStart,
                            $monthEnd
                        );
                    } else {
                        // Over-count
                        if ($daysLOP > 0) {
                            // Reject over-count with LOP
                            $notes = "Error: Uploaded total ({$uploadedTotal}) exceeds available slots ({$availableSlots}) with non-zero LOP. Original: {$daysPresent} present / {$daysLOP} LOP. Only {$totalWorkingDays} weekdays exist in this period, and {$existingPunchCount} are already recorded.";
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
                                $monthStart,
                                $monthEnd
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
     * @return array
     */
    public function expandToDaily(int $employeeId, int $daysPresent, int $daysLOP, Carbon $monthStart, Carbon $monthEnd): array
    {
        // Get all weekday dates in the month
        $allWeekdays = $this->getWeekdaysInRange($monthStart, $monthEnd);

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
     * Get all weekday date strings (Mon-Fri) in a date range, inclusive.
     *
     * @param Carbon $start
     * @param Carbon $end
     * @return array  Array of 'Y-m-d' strings
     */
    private function getWeekdaysInRange(Carbon $start, Carbon $end): array
    {
        $weekdays = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                $weekdays[] = $date->toDateString();
            }
        }
        return $weekdays;
    }
}
