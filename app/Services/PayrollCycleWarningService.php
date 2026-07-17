<?php

namespace App\Services;

use App\Models\Client;
use Carbon\Carbon;

class PayrollCycleWarningService
{
    /**
     * Check if the payroll is being processed/approved/locked before the cycle end date.
     *
     * Returns an array matching the preflight format if a warning is required, or null otherwise.
     *
     * @param Client $client
     * @param string $payrollMonth  e.g. "2026-07-01"
     * @param Carbon|null $today
     * @return array|null
     */
    public function checkCycleTiming(Client $client, string $payrollMonth, ?Carbon $today = null): ?array
    {
        $today = $today ?: Carbon::today();
        $cycleEnd = $client->getCycleEndDate($payrollMonth);

        // If today is after or on the cycle end date, no timing warning is needed
        if ($today->greaterThanOrEqualTo($cycleEnd)) {
            return null;
        }

        $daysRemaining = (int) $today->diffInDays($cycleEnd);
        $formattedDate = $cycleEnd->format('M j, Y');

        if ($daysRemaining >= 1 && $daysRemaining <= 3) {
            return [
                'type' => 'info',
                'msg' => "CYCLE TIMING: Payroll cycle ends in {$daysRemaining} day(s) on {$formattedDate}. You can process now, but attendance data may be incomplete."
            ];
        }

        if ($daysRemaining > 3 && $daysRemaining <= 10) {
            return [
                'type' => 'amber',
                'msg' => "CYCLE TIMING: Payroll cycle hasn't ended yet — {$daysRemaining} days remaining (ends {$formattedDate}). Processing now will use incomplete attendance data."
            ];
        }

        // More than 10 days remaining (e.g. processing very early in the month)
        return [
            'type' => 'amber',
            'msg' => "CYCLE TIMING: Very early processing — cycle just started, {$daysRemaining} days remaining until cycle end ({$formattedDate}). Attendance data is highly incomplete."
        ];
    }
}
