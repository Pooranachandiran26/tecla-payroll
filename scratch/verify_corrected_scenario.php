<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$rand = rand(1000,9999);
$client = App\Models\Client::factory()->create([
    'edli_exempted' => true,
    'lop_basis_days' => 30,
]);
$branch = App\Models\ClientBranch::factory()->create(['client_id' => $client->id, 'is_head_office' => true]);

$empA = App\Models\Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "REDO{$rand}",
    'personal_email' => "redo{$rand}@example.com",
    'pan_number' => "PAN{$rand}R",
    'aadhaar_number' => "8888{$rand}R",
    'bank_account_number' => "2000{$rand}R",
    'bank_ifsc' => 'HDFC0001234',
    'basic_pay' => 15000,
    'hra' => 5000,
    'lop_basis_days' => 30,
    'pf_applicable' => true,
    'eps_applicable' => true,
    'date_of_birth' => '1995-01-01',
]);

foreach ($empA->required_document_types as $dt) {
    App\Models\EmployeeDocument::create(['employee_id' => $empA->id, 'document_type' => $dt, 'file_path' => 'doc.pdf', 'status' => 'verified']);
}
for ($d = 1; $d <= 31; $d++) {
    App\Models\AttendanceRecord::create(['employee_id' => $empA->id, 'attendance_date' => sprintf('2026-07-%02d', $d), 'status' => 'present']);
}

$controller = app(App\Http\Controllers\PayrollController::class);
$controller->process(new Illuminate\Http\Request(['client_id' => $client->id, 'payroll_month' => '2026-07-01']));
$parentRun = App\Models\PayrollRun::where('client_id', $client->id)->first();
$parentRun->update(['status' => 'approved']);
$controller->lock($parentRun->id);

$corrSvc = app(App\Services\PayrollCorrectionService::class);
// 31 calendar days in July. With 5 LOP days, corrected paid days = 31 - 5 = 26 paid days.
$preview = $corrSvc->calculateCorrectionPreview($empA, $parentRun, 26.0, 5.0);

echo "=== RECONCILED DAY COUNT ===" . PHP_EOL;
echo "Calendar Days in July: 31" . PHP_EOL;
echo "Original: 31 Paid Days + 0 LOP Days = 31 Total Days" . PHP_EOL;
echo "Corrected: 26 Paid Days + 5 LOP Days = 31 Total Days" . PHP_EOL;
echo "LOP Divisor Basis: 30" . PHP_EOL . PHP_EOL;

echo "=== 1. ORIGINAL STATE (31 Paid Days, 0 LOP Days) ===" . PHP_EOL;
echo "Paid Days: " . $preview['original']['paid_days'] . PHP_EOL;
echo "Basic Pay: ₹" . number_format($preview['original']['basic_pay'], 2) . PHP_EOL;
echo "Gross Total: ₹" . number_format($preview['original']['gross_total'], 2) . PHP_EOL;
echo "Employer EPF: ₹" . number_format($preview['original']['employer_epf'], 2) . PHP_EOL;
echo "Employer EPS: ₹" . number_format($preview['original']['employer_eps'], 2) . PHP_EOL;
echo "Total ER PF (EPF + EPS + Admin): ₹" . number_format($preview['original']['employer_pf'], 2) . PHP_EOL . PHP_EOL;

echo "=== 2. CORRECTED STATE (26 Paid Days, 5 LOP Days, Divisor 30) ===" . PHP_EOL;
echo "Paid Days: " . $preview['corrected']['paid_days'] . PHP_EOL;
echo "Basic Pay (15000 * 26/30): ₹" . number_format($preview['corrected']['basic_pay'], 2) . PHP_EOL;
echo "Gross Total (20000 * 26/30): ₹" . number_format($preview['corrected']['gross_total'], 2) . PHP_EOL;
echo "Employer EPS (8.33% of Prorated Basic): ₹" . number_format($preview['corrected']['employer_eps'], 2) . PHP_EOL;
echo "Employer EPF (12% of Prorated Basic - EPS): ₹" . number_format($preview['corrected']['employer_epf'], 2) . PHP_EOL;
echo "Total ER PF (EPF + EPS + Admin): ₹" . number_format($preview['corrected']['employer_pf'], 2) . PHP_EOL . PHP_EOL;

echo "=== 3. DELTA RECONCILIATION (Corrected - Original) ===" . PHP_EOL;
echo "Employer EPF Delta: ₹" . number_format($preview['corrected']['employer_epf'], 2) . " - ₹" . number_format($preview['original']['employer_epf'], 2) . " = ₹" . number_format($preview['delta']['employer_epf'], 2) . PHP_EOL;
echo "Employer EPS Delta: ₹" . number_format($preview['corrected']['employer_eps'], 2) . " - ₹" . number_format($preview['original']['employer_eps'], 2) . " = ₹" . number_format($preview['delta']['employer_eps'], 2) . PHP_EOL;
echo "Total ER PF Delta: ₹" . number_format($preview['corrected']['employer_pf'], 2) . " - ₹" . number_format($preview['original']['employer_pf'], 2) . " = ₹" . number_format($preview['delta']['employer_pf'], 2) . PHP_EOL;
echo "Net Pay Delta: ₹" . number_format($preview['delta']['net_pay'], 2) . PHP_EOL;
