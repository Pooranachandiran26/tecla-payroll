<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use App\Models\AttendanceRecord;
use Carbon\Carbon;

$emp129 = Employee::where('employee_code', 'TEC-129')->first();
$emp130 = Employee::where('employee_code', 'TEC-130')->first();

echo "TEC-129:\n";
if ($emp129) {
    echo "  Name: {$emp129->full_name}\n";
    echo "  DOJ: {$emp129->date_of_joining}\n";
    echo "  ATS Date: {$emp129->attendance_tracking_start_date}\n";
    echo "  Off pattern: " . json_encode($emp129->weekly_off_pattern) . "\n";
    $p129 = AttendanceRecord::where('employee_id', $emp129->id)
        ->whereBetween('attendance_date', ['2026-09-01', '2026-09-30'])
        ->count();
    echo "  Punches in Sep 2026: {$p129}\n";
} else {
    echo "  Not found\n";
}

echo "\nTEC-130:\n";
if ($emp130) {
    echo "  Name: {$emp130->full_name}\n";
    echo "  DOJ: {$emp130->date_of_joining}\n";
    echo "  ATS Date: {$emp130->attendance_tracking_start_date}\n";
    echo "  Off pattern: " . json_encode($emp130->weekly_off_pattern) . "\n";
    $p130 = AttendanceRecord::where('employee_id', $emp130->id)
        ->whereBetween('attendance_date', ['2026-09-01', '2026-09-30'])
        ->count();
    echo "  Punches in Sep 2026: {$p130}\n";
} else {
    echo "  Not found\n";
}
