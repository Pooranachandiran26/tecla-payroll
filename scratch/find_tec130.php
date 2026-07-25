<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use Illuminate\Support\Facades\DB;

$emp = Employee::where('employee_code', 'TEC-130')->first();
echo "TEC-130 ID: " . ($emp ? $emp->id : 'not found') . "\n";

$allRevs = DB::table('salary_revisions')->get();
echo "Total Salary Revisions in DB: " . count($allRevs) . "\n";
foreach ($allRevs as $r) {
    echo "ID: {$r->id} | EmpID: {$r->employee_id} | Effective: {$r->effective_date} | Status: {$r->status}\n";
}

$allRuns = DB::table('payroll_runs')->get();
echo "Total Payroll Runs: " . count($allRuns) . "\n";
foreach ($allRuns as $run) {
    echo "Run ID: {$run->id} | Client: {$run->client_id} | Month: {$run->payroll_month} | Status: {$run->status}\n";
}
