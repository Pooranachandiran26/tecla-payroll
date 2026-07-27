
<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use App\Models\PayrollRunItem;

echo "=========================================================\n";
echo "INSPECTING TEC-006 (Rajesh S) & TEC-004 (PREM S) DATABASE DATA\n";
echo "=========================================================\n";

$emp6 = Employee::where('employee_code', 'TEC-006')->orWhere('id', 6)->first();
if ($emp6) {
    echo "TEC-006 Employee Master Record:\n";
    echo "  ID: {$emp6->id}\n";
    echo "  Name: {$emp6->full_name}\n";
    echo "  Basic Pay: ₹" . number_format($emp6->basic_pay, 2) . "\n";
    echo "  HRA: ₹" . number_format($emp6->hra, 2) . "\n";
    echo "  Gross Monthly Salary: ₹" . number_format($emp6->gross_monthly_salary, 2) . "\n";
    echo "  CTC Monthly: ₹" . number_format($emp6->ctc_monthly, 2) . "\n";
    echo "  Created At: {$emp6->created_at}\n";
    echo "  Updated At: {$emp6->updated_at}\n\n";

    $revisions = \App\Models\SalaryRevision::where('employee_id', $emp6->id)->get();
    echo "  Salary Revisions Count for TEC-006: " . $revisions->count() . "\n";
    foreach ($revisions as $rev) {
        echo "    - Rev ID: {$rev->id} | Old Basic: ₹" . number_format($rev->old_basic_pay, 2) . " -> New Basic: ₹" . number_format($rev->new_basic_pay, 2) . " | Status: {$rev->status} | Effective: {$rev->effective_date}\n";
    }

    $items6 = PayrollRunItem::with('payrollRun')->where('employee_id', $emp6->id)->get();
    echo "  Payroll Run Items Count for TEC-006: " . $items6->count() . "\n";
    foreach ($items6 as $item) {
        echo "    - Run Month: {$item->payrollRun->payroll_month} | Status: {$item->payrollRun->status} | Basic: ₹" . number_format($item->basic_pay, 2) . " | Gross: ₹" . number_format($item->gross_earnings, 2) . " | Net Pay: ₹" . number_format($item->net_pay, 2) . " | Item Created At: {$item->created_at}\n";
    }
} else {
    echo "TEC-006 not found!\n";
}

echo "\n---------------------------------------------------------\n";

$emp4 = Employee::where('employee_code', 'TEC-004')->orWhere('id', 4)->first();
if ($emp4) {
    echo "TEC-004 Employee Master Record:\n";
    echo "  ID: {$emp4->id}\n";
    echo "  Name: {$emp4->full_name}\n";
    echo "  Basic Pay: ₹" . number_format($emp4->basic_pay, 2) . "\n";
    echo "  Gross Monthly Salary: ₹" . number_format($emp4->gross_monthly_salary, 2) . "\n";
    echo "  Created At: {$emp4->created_at}\n";
    echo "  Updated At: {$emp4->updated_at}\n\n";

    $items4 = PayrollRunItem::with('payrollRun')->where('employee_id', $emp4->id)->get();
    echo "  Payroll Run Items Count for TEC-004: " . $items4->count() . "\n";
    foreach ($items4 as $item) {
        echo "    - Run Month: {$item->payrollRun->payroll_month} | Status: {$item->payrollRun->status} | Basic: ₹" . number_format($item->basic_pay, 2) . " | Gross: ₹" . number_format($item->gross_earnings, 2) . " | Net Pay: ₹" . number_format($item->net_pay, 2) . "\n";
    }
} else {
    echo "TEC-004 not found!\n";
}

echo "=========================================================\n";
