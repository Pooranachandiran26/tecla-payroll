<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;

$keepUser = User::where('email', 'employee@example.com')->first();
$keepEmployeeId = $keepUser ? $keepUser->employee_id : null;

if (!$keepEmployeeId) {
    $keepEmployee = Employee::where('email', 'employee@example.com')->first();
    $keepEmployeeId = $keepEmployee ? $keepEmployee->id : null;
}

if (!$keepEmployeeId) {
    // If not found by email, pick the first active employee to ensure we retain at least one employee
    $keepEmployee = Employee::first();
    $keepEmployeeId = $keepEmployee ? $keepEmployee->id : null;
    if ($keepEmployee && $keepUser) {
        $keepUser->employee_id = $keepEmployeeId;
        $keepUser->save();
    }
}

if (!$keepEmployeeId) {
    echo "ERROR: Target employee employee@example.com not found in database.";
    exit;
}

DB::beginTransaction();
try {
    // Get all employee IDs to delete
    $deleteEmpIds = Employee::where('id', '!=', $keepEmployeeId)->pluck('id')->toArray();
    $deleteUserIds = User::where('role', 'employee')
        ->where('email', '!=', 'employee@example.com')
        ->pluck('id')
        ->toArray();

    if (!empty($deleteEmpIds)) {
        // Delete related child records
        DB::table('attendance_records')->whereIn('employee_id', $deleteEmpIds)->delete();
        DB::table('employee_documents')->whereIn('employee_id', $deleteEmpIds)->delete();
        DB::table('salary_revisions')->whereIn('employee_id', $deleteEmpIds)->delete();
        DB::table('employee_loans')->whereIn('employee_id', $deleteEmpIds)->delete();
        DB::table('attendance_upload_staging_rows')->whereIn('employee_code', function($q) use ($deleteEmpIds) {
            $q->select('employee_code')->from('employees')->whereIn('id', $deleteEmpIds);
        })->delete();

        // Delete employees
        Employee::whereIn('id', $deleteEmpIds)->delete();
    }

    if (!empty($deleteUserIds)) {
        User::whereIn('id', $deleteUserIds)->delete();
    }

    DB::commit();

    $remainingEmps = Employee::count();
    $remainingUsers = User::count();

    echo "SUCCESS: Kept employee@example.com (Employee ID: {$keepEmployeeId}). Deleted " . count($deleteEmpIds) . " other employees. Remaining Employees: {$remainingEmps}, Remaining System Users: {$remainingUsers}.";

} catch (\Throwable $e) {
    DB::rollBack();
    echo "ERROR: " . $e->getMessage();
}
