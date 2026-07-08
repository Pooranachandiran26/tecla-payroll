<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$console = $app->make(Illuminate\Contracts\Console\Kernel::class);
$console->bootstrap();

echo "--- 1. Synstar Staffing Verification ---\n";
$client = \App\Models\Client::where('company_name', 'Synstar Staffing')->first();
if ($client) {
    echo $client->id . ' | ' . $client->gstin . ' | ' . $client->esi_applicable . ' | ' . $client->lop_basis_days . "\n";
    $employee = \App\Models\Employee::where('client_id', $client->id)->first();
    if ($employee) {
        echo $employee->id . ' | gross: ' . $employee->gross_monthly_salary 
             . ' | employer_esi_monthly: ' . $employee->employer_esi_monthly 
             . ' | employer_pf_monthly: ' . $employee->employer_pf_monthly . "\n";
    } else {
        echo "Employee under Synstar Staffing not found.\n";
    }
} else {
    echo "Synstar Staffing client not found.\n";
}

echo "\n--- 2. TEC-088 Verification ---\n";
$tec088 = \App\Models\Employee::where('employee_code', 'TEC-088')->first();
if ($tec088) {
    echo "TEC-088 Found | employer_pf_monthly: " . $tec088->employer_pf_monthly . "\n";
} else {
    echo "TEC-088 NOT FOUND.\n";
}
