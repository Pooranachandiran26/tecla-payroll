<?php

namespace App\Services;

use App\Models\Employee;
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

        // Bound the resolution window by the employee's date_of_joining.
        // Days before date_of_joining are completely excluded — they are neither paid nor LOP.
        $doj = Carbon::parse($employee->date_of_joining)->startOfDay();
        $effectiveStart = $startDate->gt($doj) ? $startDate->copy() : $doj->copy();

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

        $paidDays = 0.0;
        $lopDays = 0.0;
        $sources = [];
        $incompletePunches = [];
        $unexpectedRecords = [];
        
        // Iterate from the effective start date (bounded by date_of_joining) to month end
        for ($date = $effectiveStart->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->toDateString();
            
            // Check if there is an attendance record
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
                // If there's NO attendance record at all for a date:
                // Weekends do not count toward LOP (a day nobody is expected to punch simply never gets flagged as absent).
                if ($date->isWeekend()) {
                    $paidDays += 1.0;
                } else {
                    $lopDays += 1.0;
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
}
