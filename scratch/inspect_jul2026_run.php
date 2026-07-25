<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$itemsJul = DB::table('payroll_run_items')
    ->where('payroll_run_id', 20) // July 2026 for LOP_TESTING
    ->get();

echo "July 2026 Payroll Run Items (Run #20):\n";
foreach ($itemsJul as $item) {
    echo "EmpID: {$item->employee_id} | Basic: {$item->basic_pay} | Gross: {$item->gross_total} | RevisionApplied: {$item->salary_revision_applied} | Notes: {$item->warning_notes}\n";
}
