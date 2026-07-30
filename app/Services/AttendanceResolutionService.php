<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceResolutionService
{
    /**
     * Resolve monthly attendance paid days, LOP days, and attendance source.
     *
     * @param Employee $employee
     * @param string $monthStart (Y-m-d)
     * @param string $monthEnd (Y-m-d)
     * @return array
     */
    public function resolveForEmployee(Employee $employee, string $monthStart, string $monthEnd): array
    {
        $startDate = Carbon::parse($monthStart);
        $endDate = Carbon::parse($monthEnd);

        // Bound the resolution window by the employee's date_of_joining AND attendance_tracking_start_date (if set).
        // Days before effective start date are completely excluded — they are neither paid nor LOP.
        $doj = Carbon::parse($employee->date_of_joining)->startOfDay();
        $effectiveStart = $startDate->gt($doj) ? $startDate->copy() : $doj->copy();

        if (!empty($employee->attendance_tracking_start_date)) {
            $atsd = Carbon::parse($employee->attendance_tracking_start_date)->startOfDay();
            if ($atsd->gt($effectiveStart)) {
                $effectiveStart = $atsd->copy();
            }
        }

        // Defensive: if date_of_joining is after the entire target month, return zeroes
        if ($effectiveStart->gt($endDate)) {
            return [
                'paid_days' => 0.0,
                'lop_days' => 0.0,
                'attendance_source' => 'live_punch',
                'incomplete_punches' => [],
                'unexpected_records' => [],
            ];
        }
        
        // Fetch all attendance records for the month
        $records = DB::table('attendance_records')
            ->where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->get()
            ->keyBy('attendance_date');

        // Pre-load all approved overrides for this employee in the date range (avoid N+1 queries)
        $overrides = EmployeeAttendanceOverride::where('employee_id', $employee->id)
            ->whereBetween('override_date', [$monthStart, $monthEnd])
            ->where('status', 'approved')
            ->get()
            ->groupBy(fn($o) => Carbon::parse($o->override_date)->toDateString());

        // Pre-load all holidays for this client in the date range
        $holidays = Holiday::where('client_id', $employee->client_id)
            ->whereBetween('holiday_date', [$monthStart, $monthEnd])
            ->pluck('holiday_date')
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->flip()
            ->all();

        // Resolve weekly off pattern once: employee override → client default → fallback 'sat,sun'
        $weeklyOffPattern = $employee->weekly_off_pattern
            ?? $employee->client->weekly_off_pattern
            ?? 'sat,sun';
        $offDays = array_map('trim', explode(',', strtolower($weeklyOffPattern)));

        $paidDays = 0.0;
        $lopDays = 0.0;
        $sources = [];
        $incompletePunches = [];
        $unexpectedRecords = [];
        
        // Iterate from the effective start date (bounded by date_of_joining) to month end
        for ($date = $effectiveStart->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->toDateString();
            
            // ════════════════════════════════════════════════════════════════
            // PRIORITY 1: Real attendance record ALWAYS wins ("reality beats plan").
            // If a real attendance_records row exists for this date, it takes
            // absolute priority over ALL overrides, holidays, and weekly off
            // patterns — full stop.
            // ════════════════════════════════════════════════════════════════
            if (isset($records[$dateStr])) {
                $record = $records[$dateStr];
                if (!empty($record->source)) {
                    $sources[] = $record->source;
                }
                
                switch ($record->status) {
                    case 'present':
                        $paidDays += 1.0;
                        break;
                    case 'half_day':
                        $paidDays += 0.5;
                        $lopDays += 0.5;
                        break;
                    case 'on_leave':
                        $paidDays += 1.0;
                        break;
                    case 'absent':
                        $lopDays += 1.0;
                        break;
                    default:
                        // Fallback/Safety - strictly treat all anomalies as LOP and flag them
                        if (!empty($record->punch_in_time) && empty($record->punch_out_time) && empty($record->status)) {
                            // Case 1: Genuine incomplete punch (punch_in set, punch_out null, status null)
                            $lopDays += 1.0;
                            $incompletePunches[] = $dateStr;
                        } else {
                            // Case 2: Anything else genuinely unexpected (unrecognized status or structural corruption)
                            $lopDays += 1.0;
                            $unexpectedRecords[] = [
                                'date' => $dateStr,
                                'status' => $record->status ?? 'NULL',
                            ];
                        }
                        break;
                }
            } else {
                // ════════════════════════════════════════════════════════════
                // NO attendance record exists for this date.
                // Apply the hierarchy: Override → Holiday → Weekly Off → LOP.
                // ════════════════════════════════════════════════════════════
                $dayType = $this->resolveDayType($dateStr, $date, $overrides, $holidays, $offDays);

                if ($dayType === 'work_day') {
                    // Expected to work, no record found → LOP
                    $lopDays += 1.0;
                } else {
                    // weekly_off, holiday, or paid_leave → Paid (no record needed)
                    // TODO: if a 'half_day' override type is ever added to the attendance_day_type
                    // enum, it would need explicit handling here (0.5 paid + 0.5 LOP) rather than
                    // falling through to this fully-paid branch.
                    $paidDays += 1.0;
                }
            }
        }
        
        // Determine consolidated source: 'live_punch', 'uploaded', or 'mixed'
        $uniqueSources = array_unique($sources);
        if (empty($uniqueSources)) {
            $attendanceSource = 'live_punch'; // Default fallback if no records at all
        } elseif (count($uniqueSources) === 1) {
            $sourceVal = reset($uniqueSources);
            $attendanceSource = ($sourceVal === 'live_punch' || $sourceVal === 'uploaded') ? $sourceVal : 'mixed';
        } else {
            $attendanceSource = 'mixed';
        }

        return [
            'paid_days' => $paidDays,
            'lop_days' => $lopDays,
            'attendance_source' => $attendanceSource,
            'incomplete_punches' => $incompletePunches,
            'unexpected_records' => $unexpectedRecords,
        ];
    }

    /**
     * Determine day type for a date with no attendance record.
     *
     * Hierarchy (highest to lowest priority):
     *   1. Approved employee attendance override for this date
     *   2. Client holiday on this date
     *   3. Weekly off pattern (employee → client → default 'sat,sun')
     *   4. Default: 'work_day' (no record → LOP)
     *
     * @param string $dateStr       'Y-m-d' date string
     * @param Carbon $date          Carbon date object (for day-of-week check)
     * @param \Illuminate\Support\Collection $overrides  Pre-loaded overrides grouped by date string
     * @param array $holidays       Pre-loaded holiday dates as keys (flipped array)
     * @param array $offDays        Weekly off day abbreviations (e.g. ['sat', 'sun'])
     * @return string One of: 'work_day', 'weekly_off', 'holiday', 'paid_leave'
     */
    private function resolveDayType(
        string $dateStr,
        Carbon $date,
        $overrides,
        array $holidays,
        array $offDays
    ): string {
        // 1. Check approved attendance overrides (highest priority)
        if (isset($overrides[$dateStr])) {
            // If multiple approved rows exist (should not happen due to submission-time blocking),
            // deterministically pick the latest approved_at.
            $override = $overrides[$dateStr]->sortByDesc('approved_at')->first();
            return $override->attendance_day_type; // 'work_day', 'weekly_off', 'holiday', 'paid_leave'
        }

        // 2. Check client holidays
        if (isset($holidays[$dateStr])) {
            return 'holiday'; // Paid
        }

        // 3. Check weekly off pattern
        $dayAbbr = strtolower($date->format('D')); // 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
        if (in_array($dayAbbr, $offDays)) {
            return 'weekly_off'; // Paid
        }

        // 4. Default: expected working day (no record → LOP)
        return 'work_day';
    }

    /**
     * Classify a date's natural type for an employee, ignoring overrides.
     *
     * Hierarchy:
     *   1. Client holiday on this date -> 'holiday'
     *   2. Weekly off pattern (employee override -> client default -> fallback 'sat,sun') -> 'weekly_off'
     *   3. Default -> 'work_day'
     *
     * @param Employee $employee
     * @param \Carbon\Carbon|string $date
     * @return array ['type' => string, 'holiday' => ?\App\Models\Holiday]
     */
    public function classifyNaturalDate(Employee $employee, $date): array
    {
        $dateObj = is_string($date) ? Carbon::parse($date) : $date;
        $dateStr = $dateObj->toDateString();

        // 1. Check client holiday
        $holiday = Holiday::where('client_id', $employee->client_id)
            ->whereDate('holiday_date', $dateStr)
            ->first();

        if ($holiday) {
            return [
                'type' => 'holiday',
                'holiday' => $holiday,
            ];
        }

        // 2. Check weekly off pattern
        $weeklyOffPattern = $employee->weekly_off_pattern
            ?? optional($employee->client)->weekly_off_pattern
            ?? 'sat,sun';
        $offDays = array_map('trim', explode(',', strtolower($weeklyOffPattern)));
        $dayAbbr = strtolower($dateObj->format('D'));

        if (in_array($dayAbbr, $offDays)) {
            return [
                'type' => 'weekly_off',
                'holiday' => null,
            ];
        }

        // 3. Default: work_day
        return [
            'type' => 'work_day',
            'holiday' => null,
        ];
    }

    /**
     * Resolve effective day classification for an employee on a single date,
     * checking approved overrides first, then falling back to natural classification.
     *
     * @param Employee $employee
     * @param \Carbon\Carbon|string $date
     * @return array [
     *    'effective_type' => string,
     *    'natural_type'   => string,
     *    'override'       => ?\App\Models\EmployeeAttendanceOverride,
     *    'holiday'        => ?\App\Models\Holiday
     * ]
     */
    public function resolveDayTypeForEmployee(Employee $employee, $date): array
    {
        $dateObj = is_string($date) ? Carbon::parse($date) : $date;
        $dateStr = $dateObj->toDateString();

        // 1. Check approved attendance override
        $override = EmployeeAttendanceOverride::where('employee_id', $employee->id)
            ->whereDate('override_date', $dateStr)
            ->where('status', 'approved')
            ->orderBy('approved_at', 'desc')
            ->first();

        // 2. Resolve natural classification
        $natural = $this->classifyNaturalDate($employee, $dateObj);

        $effectiveType = $override ? $override->attendance_day_type : $natural['type'];

        return [
            'effective_type' => $effectiveType,
            'natural_type'   => $natural['type'],
            'override'       => $override,
            'holiday'        => $natural['holiday'],
        ];
    }
}

