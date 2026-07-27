<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$revs = DB::table('salary_revisions')
    ->where('employee_id', 2) // TEC-130
    ->orWhere('employee_id', 1)
    ->get();

echo "Salary Revisions:\n";
foreach ($revs as $r) {
    echo "ID: {$r->id} | EmpID: {$r->employee_id} | Effective: {$r->effective_date} | Status: {$r->status} | OldBasic: {$r->old_basic_pay} | NewBasic: {$r->new_basic_pay}\n";
}

$items = DB::table('payroll_run_items')
    ->where('employee_id', 2)
    ->get();

echo "\nPayroll Run Items for TEC-130:\n";
foreach ($items as $item) {
    echo "RunID: {$item->payroll_run_id} | RevisionApplied: {$item->salary_revision_applied} | Notes: {$item->warning_notes}\n";
}
