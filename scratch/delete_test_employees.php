<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;

$employees = Employee::where('employee_code', 'like', 'TIMING_%')
                     ->orWhere('employee_code', 'like', 'PROOF_%')
                     ->get();
$count = $employees->count();

if ($count > 0) {
    $employeeIds = $employees->pluck('id')->toArray();
    
    // Delete associated users first to avoid foreign key or dangling records
    $deletedUsers = User::whereIn('employee_id', $employeeIds)->delete();
    
    // Force delete employees
    $deletedEmployees = Employee::whereIn('id', $employeeIds)->forceDelete();
    
    echo "Deleted $deletedUsers users and $deletedEmployees employees matching TIMING_% or PROOF_%.\n";
} else {
    echo "No employees found matching TIMING_% or PROOF_%.\n";
}

// Clear the jobs table since it's clogged with provisioning jobs for deleted employees
DB::table('jobs')->truncate();
echo "Truncated jobs table.\n";
