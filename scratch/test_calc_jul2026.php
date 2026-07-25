<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\MonthlyPayrollCalculator;

$run = PayrollRun::find(20); // July 2026 for LOP_TESTING
$emp130 = Employee::find(130); // TEC-130

$calc = app(MonthlyPayrollCalculator::class);
$res = $calc->calculateForEmployee($emp130, $run);

echo "Recalculated July 2026 for TEC-130:\n";
echo "Gross: {$res['gross_total']}\n";
echo "Revision Applied: " . ($res['salary_revision_applied'] ? 'YES' : 'NO') . "\n";

$item = DB::table('payroll_run_items')
    ->where('payroll_run_id', 20)
    ->where('employee_id', 130)
    ->first();

echo "DB Item RevisionApplied: {$item->salary_revision_applied}\n";
echo "DB Item WarningNotes: {$item->warning_notes}\n";
