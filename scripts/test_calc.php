<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$client = App\Models\Client::where('client_code', 'VERIF001')->first();
$empA = App\Models\Employee::where('employee_code', 'EMP-A001')->first();
$empB = App\Models\Employee::where('employee_code', 'EMP-B002')->first();
$payrollRun = App\Models\PayrollRun::where('client_id', $client->id)->first();

$calc = app(App\Services\MonthlyPayrollCalculator::class);
$calc->calculateForEmployee($empA, $payrollRun);
$calc->calculateForEmployee($empB, $payrollRun);

$itemA = App\Models\PayrollRunItem::where('payroll_run_id', $payrollRun->id)->where('employee_id', $empA->id)->first();
$itemB = App\Models\PayrollRunItem::where('payroll_run_id', $payrollRun->id)->where('employee_id', $empB->id)->first();

echo "Item A Columns:\n";
print_r($itemA->only(['basic_pay', 'hra', 'conveyance', 'gross_total', 'employee_pf', 'employee_esi', 'professional_tax', 'lop_deduction', 'net_pay', 'employer_pf', 'employer_esi']));

echo "\nItem B Columns:\n";
print_r($itemB->only(['basic_pay', 'hra', 'conveyance', 'gross_total', 'employee_pf', 'employee_esi', 'professional_tax', 'lop_deduction', 'net_pay', 'employer_pf', 'employer_esi']));
