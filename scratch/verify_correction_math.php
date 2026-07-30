<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$rand = rand(1000,9999);
$client = App\Models\Client::factory()->create(['edli_exempted' => true]);
$branch = App\Models\ClientBranch::factory()->create(['client_id' => $client->id, 'is_head_office' => true]);
$empA = App\Models\Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "MATH{$rand}",
    'personal_email' => "math{$rand}@example.com",
    'pan_number' => "PAN{$rand}M",
    'aadhaar_number' => "8888{$rand}M",
    'bank_account_number' => "2000{$rand}M",
    'bank_ifsc' => 'HDFC0001234',
    'basic_pay' => 15000,
    'hra' => 5000,
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
$preview = $corrSvc->calculateCorrectionPreview($empA, $parentRun, 25.0, 5.0);

echo "=== 1. ORIGINAL (Full Month / 30 Paid Days in parent run) ===\n";
echo "Paid Days: " . $preview['original']['paid_days'] . "\n";
echo "Basic Pay: ₹" . number_format($preview['original']['basic_pay'], 2) . "\n";
echo "Gross Total: ₹" . number_format($preview['original']['gross_total'], 2) . "\n";
echo "Employer EPF: ₹" . number_format($preview['original']['employer_epf'], 2) . "\n";
echo "Employer EPS: ₹" . number_format($preview['original']['employer_eps'], 2) . "\n";
echo "Total ER PF (EPF + EPS + Admin): ₹" . number_format($preview['original']['employer_pf'], 2) . "\n\n";

echo "=== 2. CORRECTED (25 Paid Days = 20 Present + 5 LOP) ===\n";
echo "Paid Days: " . $preview['corrected']['paid_days'] . "\n";
echo "Basic Pay: ₹" . number_format($preview['corrected']['basic_pay'], 2) . "\n";
echo "Gross Total: ₹" . number_format($preview['corrected']['gross_total'], 2) . "\n";
echo "PF Eligible Wage (Basic prorated): ₹" . number_format($preview['corrected']['basic_pay'], 2) . "\n";
echo "EPS Cap Base (min(Prorated Basic, 15000 * 25/26)): ₹" . number_format(min($preview['corrected']['basic_pay'], round(15000 * (25/26), 2)), 2) . "\n";
echo "Employer EPS (8.33% of EPS Cap Base): ₹" . number_format($preview['corrected']['employer_eps'], 2) . "\n";
echo "Employer EPF (12% of Prorated Basic - EPS): ₹" . number_format($preview['corrected']['employer_epf'], 2) . "\n";
echo "Total ER PF (EPF + EPS + Admin): ₹" . number_format($preview['corrected']['employer_pf'], 2) . "\n\n";

echo "=== 3. DELTA VERIFICATION (Corrected - Original) ===\n";
echo "Employer EPF Delta: ₹" . number_format($preview['corrected']['employer_epf'], 2) . " - ₹" . number_format($preview['original']['employer_epf'], 2) . " = ₹" . number_format($preview['delta']['employer_epf'], 2) . "\n";
echo "Employer EPS Delta: ₹" . number_format($preview['corrected']['employer_eps'], 2) . " - ₹" . number_format($preview['original']['employer_eps'], 2) . " = ₹" . number_format($preview['delta']['employer_eps'], 2) . "\n";
echo "Total ER PF Delta: ₹" . number_format($preview['corrected']['employer_pf'], 2) . " - ₹" . number_format($preview['original']['employer_pf'], 2) . " = ₹" . number_format($preview['delta']['employer_pf'], 2) . "\n";
