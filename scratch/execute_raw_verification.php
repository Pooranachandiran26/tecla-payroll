<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$rand = rand(1000,9999);

// 1. Setup real Client & Employee STRESS-A in DB
$client = App\Models\Client::factory()->create([
    'company_name' => "Raw Verification Client {$rand}",
    'client_code' => "RVC{$rand}",
    'edli_exempted' => true,
    'lop_basis_days' => 30,
]);
$branch = App\Models\ClientBranch::factory()->create(['client_id' => $client->id, 'is_head_office' => true]);

$empA = App\Models\Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "STRA{$rand}",
    'first_name' => 'Anand',
    'last_name' => 'Kumar',
    'personal_email' => "stra{$rand}@example.com",
    'pan_number' => "PAN{$rand}V",
    'aadhaar_number' => "8888{$rand}V",
    'bank_account_number' => "2000{$rand}V",
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

echo "=== STEP 1: REAL EMPLOYEE RECORD FROM DB ===" . PHP_EOL;
$loadedEmp = App\Models\Employee::find($empA->id);
var_dump([
    'id' => $loadedEmp->id,
    'employee_code' => $loadedEmp->employee_code,
    'basic_pay' => $loadedEmp->basic_pay,
    'hra' => $loadedEmp->hra,
    'lop_basis_days' => $loadedEmp->lop_basis_days,
    'pf_applicable' => $loadedEmp->pf_applicable,
    'eps_applicable' => $loadedEmp->eps_applicable,
    'date_of_birth' => $loadedEmp->date_of_birth,
]);
echo PHP_EOL;

// 2. Call SalaryCalculationService::calculateStructuralSalary() TWICE with full vs pro-rated payloads
$calcSvc = app(App\Services\SalaryCalculationService::class);

$origEmpData = [
    'basic_pay' => 15000.00,
    'hra' => 5000.00,
    'client_id' => $client->id,
    'pf_applicable' => true,
    'eps_applicable' => true,
    'date_of_birth' => '1995-01-01',
    'payroll_month' => '2026-07-01'
];

// Corrected pro-rated components (5 LOP days out of 30 basis days => LOP = 5/30)
$basicLop = round(15000.00 * (5 / 30), 2); // 2500.00
$corrBasic = round(15000.00 - $basicLop, 2); // 12500.00

$hraLop = round(5000.00 * (5 / 30), 2); // 833.33
$corrHra = round(5000.00 - $hraLop, 2); // 4166.67

$corrEmpData = [
    'basic_pay' => $corrBasic,
    'hra' => $corrHra,
    'client_id' => $client->id,
    'pf_applicable' => true,
    'eps_applicable' => true,
    'date_of_birth' => '1995-01-01',
    'payroll_month' => '2026-07-01'
];

echo "=== STEP 2a: ORIGINAL SALARY CALCULATION (31 paid days, 0 LOP) ===" . PHP_EOL;
$origStat = $calcSvc->calculateStructuralSalary($origEmpData);
print_r($origStat);
echo PHP_EOL;

echo "=== STEP 2b: CORRECTED SALARY CALCULATION (26 paid days, 5 LOP) ===" . PHP_EOL;
$corrStat = $calcSvc->calculateStructuralSalary($corrEmpData);
print_r($corrStat);
echo PHP_EOL;

// 4. Compute independent delta via PHP code
echo "=== STEP 4: INDEPENDENTLY COMPUTED DELTA (Corrected - Original) ===" . PHP_EOL;
$independentEPFDelta = round($corrStat['employer_epf_monthly'] - $origStat['employer_epf_monthly'], 2);
$independentEPSDelta = round($corrStat['employer_eps_monthly'] - $origStat['employer_eps_monthly'], 2);
$independentTotalPFDelta = round($corrStat['employer_pf_monthly'] - $origStat['employer_pf_monthly'], 2);

var_dump([
    'independent_epf_delta' => $independentEPFDelta,
    'independent_eps_delta' => $independentEPSDelta,
    'independent_total_pf_delta' => $independentTotalPFDelta,
]);
echo PHP_EOL;

// 5. Call REAL PayrollCorrectionService calculateCorrectionPreview & applyCorrection
echo "=== STEP 5: REAL PAYROLL CORRECTION SERVICE EXECUTION ===" . PHP_EOL;
$controller = app(App\Http\Controllers\PayrollController::class);
$controller->process(new Illuminate\Http\Request(['client_id' => $client->id, 'payroll_month' => '2026-07-01']));
$parentRun = App\Models\PayrollRun::where('client_id', $client->id)->first();
$parentRun->update(['status' => 'approved']);
$controller->lock($parentRun->id);

$corrSvc = app(App\Services\PayrollCorrectionService::class);
$preview = $corrSvc->calculateCorrectionPreview($loadedEmp, $parentRun, 26.0, 5.0);

echo "--- RAW PREVIEW DELTA ARRAY ---" . PHP_EOL;
print_r($preview['delta']);
echo PHP_EOL;

$savedItem = $corrSvc->applyCorrection($loadedEmp, $parentRun, $preview, 'Verification test');

echo "--- RAW SAVED CORRECTION ITEM FROM DB ---" . PHP_EOL;
var_dump([
    'id' => $savedItem->id,
    'payroll_run_id' => $savedItem->payroll_run_id,
    'employee_id' => $savedItem->employee_id,
    'paid_days' => $savedItem->paid_days,
    'lop_days' => $savedItem->lop_days,
    'employer_epf' => $savedItem->employer_epf,
    'employer_eps' => $savedItem->employer_eps,
    'employer_pf' => $savedItem->employer_pf,
    'net_pay' => $savedItem->net_pay,
]);
echo PHP_EOL;

// 6. Confirm side-by-side match via PHP code comparison
echo "=== STEP 6: EYES-ON PHP EQUALITY CHECK & CONFIRMATION ===" . PHP_EOL;
$epfMatch = ($independentEPFDelta === (float)$savedItem->employer_epf);
$epsMatch = ($independentEPSDelta === (float)$savedItem->employer_eps);
$totalPFMatch = ($independentTotalPFDelta === (float)$savedItem->employer_pf);

var_dump([
    'independent_epf_delta' => $independentEPFDelta,
    'service_saved_epf_delta' => (float)$savedItem->employer_epf,
    'epf_delta_exact_match' => $epfMatch,
    
    'independent_eps_delta' => $independentEPSDelta,
    'service_saved_eps_delta' => (float)$savedItem->employer_eps,
    'eps_delta_exact_match' => $epsMatch,

    'independent_total_pf_delta' => $independentTotalPFDelta,
    'service_saved_total_pf_delta' => (float)$savedItem->employer_pf,
    'total_pf_delta_exact_match' => $totalPFMatch,
]);

if ($epfMatch && $epsMatch && $totalPFMatch) {
    echo PHP_EOL . "VERIFICATION RESULT: EXACT 100% MATCH PROVED BY EXECUTED CODE!" . PHP_EOL;
} else {
    echo PHP_EOL . "VERIFICATION RESULT: DISCREPANCY DETECTED!" . PHP_EOL;
}
