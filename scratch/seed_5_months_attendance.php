<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\AttendanceRecord;
use Carbon\Carbon;

$user = User::where('email', 'employee@example.com')->first();
if (!$user || !$user->employee_id) {
    echo "ERROR: Employee user or employee_id not found.";
    exit;
}

$employeeId = $user->employee_id;
$months = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
$totalAdded = 0;

foreach ($months as $monthStr) {
    $start = Carbon::parse($monthStr . '-01');
    $end = $start->copy()->endOfMonth();

    for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
        // Skip Sundays
        if ($date->isSunday()) {
            continue;
        }

        // Create or update attendance record
        AttendanceRecord::updateOrCreate(
            [
                'employee_id' => $employeeId,
                'attendance_date' => $date->toDateString(),
            ],
            [
                'status' => 'present',
                'source' => 'live_punch',
                'punch_in_time' => '09:30:00',
                'punch_out_time' => '18:30:00',
                'notes' => 'Auto-generated attendance record',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $totalAdded++;
    }
}

echo "SUCCESS: Added/Updated {$totalAdded} attendance records across 5 months (Apr 2026 - Aug 2026) for Employee ID {$employeeId} ({$user->name}).";
