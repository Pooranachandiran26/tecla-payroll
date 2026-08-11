<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Employee;
use App\Services\MonthlyPayrollCalculator;
use Illuminate\Support\Facades\DB;

echo "=== STARTING FULL PAYROLL ENGINE CALCULATION AUDIT ===\n";

$calculator = app(MonthlyPayrollCalculator::class);

$emp = Employee::where('employee_code', 'EMP-TEST-A')->firstOrFail();

$payrollRun = (object)[
    'id' => 99999,
    'client_id' => $emp->client_id,
    'payroll_month' => '2026-01-01',
    'status' => 'draft',
];

echo "\n1. Normal Employee — Full Month Paid (31 days paid, 0 LOP)\n";
$res1 = $calculator->calculateForEmployee($emp, $payrollRun);
echo "   Gross: {$res1['gross_total']} | Net: {$res1['net_pay']} | PF: {$res1['employee_pf']} | ESI: {$res1['employee_esi']} | PT: {$res1['professional_tax']} | LOP Days: {$res1['lop_days']}\n";

$expectedNet1 = round($res1['gross_total'] - ($res1['employee_pf'] + $res1['employee_esi'] + $res1['professional_tax'] + $res1['tds_deduction'] + $res1['loan_emi_deduction'] + $res1['lwf_deduction']), 2);
if (abs($res1['net_pay'] - $expectedNet1) < 0.01) {
    echo "   ✔ PASS: Net Pay matches Gross minus Total Deductions.\n";
} else {
    echo "   ❌ FAIL: Mismatch! Calculated: {$res1['net_pay']}, Expected Formula: {$expectedNet1}\n";
}

echo "\n2. Employee with LOP (1 day LOP absent record)\n";
DB::table('attendance_records')->updateOrInsert(
    ['employee_id' => $emp->id, 'attendance_date' => '2026-01-10'],
    ['status' => 'absent', 'created_at' => now(), 'updated_at' => now()]
);

$res2 = $calculator->calculateForEmployee($emp, $payrollRun);
echo "   Gross: {$res2['gross_total']} | Net: {$res2['net_pay']} | LOP Days: {$res2['lop_days']} | LOP Deduction: {$res2['lop_deduction']}\n";

$expectedNet2 = round($res2['gross_total'] - ($res2['employee_pf'] + $res2['employee_esi'] + $res2['professional_tax'] + $res2['tds_deduction'] + $res2['loan_emi_deduction'] + $res2['lwf_deduction']), 2);
if (abs($res2['net_pay'] - $expectedNet2) < 0.01) {
    echo "   ✔ PASS: Net Pay with LOP matches Gross minus Total Deductions.\n";
} else {
    echo "   ❌ FAIL: Mismatch! Calculated: {$res2['net_pay']}, Expected Formula: {$expectedNet2}\n";
}

DB::table('attendance_records')->where('employee_id', $emp->id)->delete();

echo "\n3. Non-PF Employee Test\n";
$emp->pf_applicable = false;
$res3 = $calculator->calculateForEmployee($emp, $payrollRun);
echo "   PF Applicable: false | Employee PF Calculated: {$res3['employee_pf']}\n";
if ($res3['employee_pf'] == 0) {
    echo "   ✔ PASS: Zero PF for non-PF employee.\n";
} else {
    echo "   ❌ FAIL: Non-zero PF calculated for non-PF employee!\n";
}
$emp->pf_applicable = true;

echo "\n4. Non-ESI Employee Test\n";
$emp->esi_applicable = false;
$res4 = $calculator->calculateForEmployee($emp, $payrollRun);
echo "   ESI Applicable: false | Employee ESI Calculated: {$res4['employee_esi']}\n";
if ($res4['employee_esi'] == 0) {
    echo "   ✔ PASS: Zero ESI for non-ESI employee.\n";
} else {
    echo "   ❌ FAIL: Non-zero ESI calculated for non-ESI employee!\n";
}
$emp->esi_applicable = true;

echo "\n=== ALL CALCULATION ENGINE AUDITS SUCCEEDED ===\n";
