<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use App\Http\Resources\EmployeeResource;

$employee = Employee::first();
if (!$employee) {
    echo "No employee found in DB\n";
    exit;
}

$resource = (new EmployeeResource($employee))->resolve();

echo "=== REAL EMPLOYEE DETAIL PAYLOAD VERIFICATION ===\n";
echo "ID: " . $employee->id . "\n";
echo "Name: " . $employee->full_name . "\n";
echo "DOB: " . ($employee->date_of_birth ?? 'N/A') . "\n";
echo "EPS Applicable: " . ($employee->eps_applicable ? 'YES' : 'NO') . "\n";
echo "Basic Pay: ₹" . number_format($employee->basic_pay, 2) . "\n";
echo "----------------------------------------\n";
echo "Employer EPF Monthly: ₹" . number_format($resource['employer_epf_monthly'], 2) . "\n";
echo "Employer EPS Monthly: ₹" . number_format($resource['employer_eps_monthly'], 2) . "\n";
echo "Total Employer PF Monthly: ₹" . number_format($resource['employer_pf_monthly'], 2) . "\n";
