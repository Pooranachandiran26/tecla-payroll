<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class StatutoryDueDateService
{
    /**
     * PF (EPFO): Due on or before the 15th of the following month.
     * Source: Paragraph 38(1) of the EPF Scheme, 1952.
     */
    public static function getPfDueDate(Carbon $payrollMonth): Carbon
    {
        return $payrollMonth->copy()->addMonth()->startOfMonth()->addDays(14); // 15th
    }

    /**
     * ESI: Due on or before the 15th of the following month.
     * Source: Regulation 31 of the ESI (General) Regulations, 1950.
     */
    public static function getEsiDueDate(Carbon $payrollMonth): Carbon
    {
        return self::getPfDueDate($payrollMonth);
    }

    /**
     * TDS (Form 24Q): Filed Quarterly. ALWAYS return the NEXT upcoming deadline.
     * Q1 (Apr-Jun): July 31
     * Q2 (Jul-Sep): October 31
     * Q3 (Oct-Dec): January 31
     * Q4 (Jan-Mar): May 31
     * Source: Rule 31A of the Income Tax Rules, 1962.
     */
    public static function getTdsDueDate(Carbon $payrollMonth): Carbon
    {
        $month = $payrollMonth->month;
        $year = $payrollMonth->year;
        
        // Find next deadline after this payroll month
        if ($month >= 4 && $month <= 6) {
            return Carbon::create($year, 7, 31)->startOfDay();
        } elseif ($month >= 7 && $month <= 9) {
            return Carbon::create($year, 10, 31)->startOfDay();
        } elseif ($month >= 10 && $month <= 12) {
            return Carbon::create($year + 1, 1, 31)->startOfDay();
        } else {
            return Carbon::create($year, 5, 31)->startOfDay();
        }
    }

    /**
     * Professional Tax (PT): State-specific.
     * Returns the earliest upcoming deadline among the provided states.
     */
    public static function getPtDueDate(Carbon $payrollMonth, array $states): ?Carbon
    {
        if (empty($states)) {
            return null;
        }

        $dueDates = collect($states)->map(function ($state) use ($payrollMonth) {
            return self::calculateStatePtDueDate($payrollMonth, $state);
        })->filter();

        if ($dueDates->isEmpty()) {
            return null;
        }

        // Return earliest
        return $dueDates->min();
    }

    private static function calculateStatePtDueDate(Carbon $payrollMonth, string $state): ?Carbon
    {
        switch ($state) {
            case 'Maharashtra':
                // Last day of the following month
                return $payrollMonth->copy()->addMonth()->endOfMonth()->startOfDay();

            case 'Karnataka':
                // 20th day of the following month
                return $payrollMonth->copy()->addMonth()->startOfMonth()->addDays(19)->startOfDay();

            case 'Tamil Nadu':
                // Half-Yearly: 15th September (for Apr-Sep) and 15th March (for Oct-Mar)
                $month = $payrollMonth->month;
                $year = $payrollMonth->year;
                
                if ($month >= 4 && $month <= 9) {
                    return Carbon::create($year, 9, 15)->startOfDay();
                } elseif ($month >= 10 && $month <= 12) {
                    return Carbon::create($year + 1, 3, 15)->startOfDay();
                } else {
                    return Carbon::create($year, 3, 15)->startOfDay();
                }

            default:
                return null;
        }
    }
}
