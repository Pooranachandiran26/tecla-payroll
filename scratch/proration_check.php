<?php

// July has 31 days
// Old Basic = 150,000
// New Basic = 1,508,700
// Revision Effective Date = July 25, 2026

$daysInMonth = 31;
$oldDays = 24; // July 1 to July 24
$newDays = 7;  // July 25 to July 31

$oldDailyRate = 150000 / $daysInMonth;
$newDailyRate = 1508700 / $daysInMonth;

$earnedOldBasic = $oldDailyRate * $oldDays;
$earnedNewBasic = $newDailyRate * $newDays;
$totalEarnedBasic = $earnedOldBasic + $earnedNewBasic;

echo "Proration Breakdown for July 2026 (31 Days):\n";
echo "1. Old Salary (July 1 - July 24 = 24 days @ ₹1,50,000/mo): ₹" . number_format($earnedOldBasic, 2) . "\n";
echo "2. New Salary (July 25 - July 31 = 7 days @ ₹15,08,700/mo): ₹" . number_format($earnedNewBasic, 2) . "\n";
echo "3. Total July Earned Basic: ₹" . number_format($totalEarnedBasic, 2) . "\n";
