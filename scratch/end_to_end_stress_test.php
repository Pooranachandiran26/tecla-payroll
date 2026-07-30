<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EmployeeQuery;
use App\Services\MonthlyPayrollCalculator;
use App\Services\PayrollCorrectionService;
use App\Http\Controllers\PayrollController;
use Illuminate\Http\Request;
use Carbon\Carbon;

echo "=== STARTING COMPREHENSIVE END-TO-END PAYROLL STRESS TEST ===\n\n";

// ── STEP 2: SEED SCENARIO ───────────────────────────────────────────────────────
$rand = rand(10000, 99999);
$client = Client::factory()->create([
    'company_name' => "Stress Test Client TN Ltd {$rand}",
    'client_code' => "STR{$rand}",
    'pt_state' => 'Tamil Nadu',
    'edli_exempted' => true,
    'health_insurance_enabled' => true,
    'status' => 'active'
]);

$branch = ClientBranch::factory()->create([
    'client_id' => $client->id,
    'branch_name' => 'Head Office Chennai',
    'branch_code' => "CHE{$rand}",
    'state' => 'Tamil Nadu',
    'city' => 'Chennai',
    'is_head_office' => true
]);

echo "Created Client ID {$client->id} (code: STR{$rand}) with TN PT State, EDLI Exempted=true, Health Insurance=true\n";

// Employee A: Normal, EPS-Eligible (under 58), Health Insurance info populated
$empA = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "STA{$rand}",
    'first_name' => 'Anand',
    'last_name' => 'Kumar',
    'designation' => 'Senior Engineer',
    'date_of_birth' => '1990-05-15', // Age ~36
    'date_of_joining' => '2023-01-01',
    'basic_pay' => 15000,
    'hra' => 5000,
    'gross_monthly_salary' => 20000,
    'pf_applicable' => true,
    'eps_applicable' => true,
    'esi_applicable' => false,
    'pt_applicable' => true,
    'status' => 'active',
    'pan_number' => "PAN{$rand}A",
    'aadhaar_number' => "8888{$rand}01",
    'bank_account_number' => "2000{$rand}01",
    'bank_ifsc' => 'HDFC0001234',
    'uan_mode' => 'existing_transfer',
    'health_insurance_provider' => 'Star Health',
    'health_insurance_policy_no' => 'POL-12345',
    'health_insurance_sum_insured' => 500000.00
]);

// Employee B: EPS Excluded explicitly (eps_applicable=false)
$empB = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "STB{$rand}",
    'first_name' => 'Bala',
    'last_name' => 'Murali',
    'designation' => 'Operations Lead',
    'date_of_birth' => '1985-08-20', // Age ~41
    'date_of_joining' => '2022-06-01',
    'basic_pay' => 15000,
    'hra' => 5000,
    'gross_monthly_salary' => 20000,
    'pf_applicable' => true,
    'eps_applicable' => false, // EPS EXCLUDED EXPLICITLY
    'esi_applicable' => false,
    'pt_applicable' => true,
    'status' => 'active',
    'pan_number' => "PAN{$rand}B",
    'aadhaar_number' => "8888{$rand}02",
    'bank_account_number' => "2000{$rand}02",
    'bank_ifsc' => 'HDFC0001234',
    'uan_mode' => 'existing_transfer'
]);

// Employee C: Age 58+ (EPS Auto Cutoff via DOB)
$empC = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "STC{$rand}",
    'first_name' => 'Chandran',
    'last_name' => 'Veteran',
    'designation' => 'Principal Consultant',
    'date_of_birth' => '1965-02-10', // Age 61 (58+)
    'date_of_joining' => '2020-01-01',
    'basic_pay' => 15000,
    'hra' => 5000,
    'gross_monthly_salary' => 20000,
    'pf_applicable' => true,
    'eps_applicable' => true, // DOB > 58 takes priority
    'esi_applicable' => false,
    'pt_applicable' => true,
    'status' => 'active',
    'pan_number' => "PAN{$rand}C",
    'aadhaar_number' => "8888{$rand}03",
    'bank_account_number' => "2000{$rand}03",
    'bank_ifsc' => 'HDFC0001234',
    'uan_mode' => 'existing_transfer'
]);

use App\Models\AttendanceRecord;
use App\Models\EmployeeDocument;

foreach ([$empA, $empB, $empC] as $emp) {
    foreach ($emp->required_document_types as $docType) {
        EmployeeDocument::create([
            'employee_id' => $emp->id,
            'document_type' => $docType,
            'file_path' => 'documents/test.pdf',
            'status' => 'verified'
        ]);
    }
}

for ($d = 1; $d <= 31; $d++) {
    $dateStr = sprintf('2026-07-%02d', $d);
    foreach ([$empA, $empB, $empC] as $emp) {
        AttendanceRecord::create([
            'employee_id' => $emp->id,
            'attendance_date' => $dateStr,
            'status' => 'present',
            'source' => 'live_punch'
        ]);
    }
}

echo "Seeded 3 Employees: STA{$rand} (EPS eligible), STB{$rand} (eps_applicable=false), STC{$rand} (Age 61) with 31 present attendance records\n\n";

// ── STEP 3: RUN FULL LIFECYCLE ──────────────────────────────────────────────────
$payrollMonth = '2026-07-01';
$controller = app(PayrollController::class);

echo "Attendance Records Count for STA: " . \App\Models\AttendanceRecord::where('employee_id', $empA->id)->count() . "\n";
$res = app(\App\Services\AttendanceResolutionService::class)->resolveForEmployee($empA, '2026-07-01', '2026-07-31');
echo "Resolved Paid Days for STA: " . $res['paid_days'] . "\n";

$elig = app(\App\Services\PayrollEligibilityService::class)->checkEmployee($empA, $client, '2026-07-01', '2026-07-31');
echo "Eligibility for STA: " . json_encode($elig) . "\n";

echo "--- 1. PROCESS PAYROLL (DRAFT) ---\n";
$req = new Request(['client_id' => $client->id, 'payroll_month' => $payrollMonth]);
$controller->process($req);

$payrollRun = PayrollRun::where('client_id', $client->id)->where('payroll_month', $payrollMonth)->first();
echo "Draft Payroll Run Created ID: {$payrollRun->id}, Status: {$payrollRun->status}\n";

$items = PayrollRunItem::where('payroll_run_id', $payrollRun->id)->get();
foreach ($items as $item) {
    $emp = Employee::find($item->employee_id);
    echo "  Employee: {$emp->employee_code} ({$emp->first_name}) | Basic: {$item->basic_pay} | EE PF: {$item->employee_pf} | ER EPF: {$item->employer_epf} | ER EPS: {$item->employer_eps} | Total ER PF: {$item->employer_pf}\n";
    
    if ($emp->id == $empA->id) {
        assert($item->employer_epf == 550.50, "STRESS-A EPF should be 550.50");
        assert($item->employer_eps == 1249.50, "STRESS-A EPS should be 1249.50");
        assert($item->employer_pf == 1875.00, "STRESS-A Total ER PF should be 1875.00 (1800 + 75 admin, edli-exempt)");
    } else if ($emp->id == $empB->id) {
        assert($item->employer_epf == 1800.00, "STRESS-B EPF should be 1800.00");
        assert($item->employer_eps == 0.00, "STRESS-B EPS should be 0.00");
    } else if ($emp->id == $empC->id) {
        assert($item->employer_epf == 1800.00, "STRESS-C EPF should be 1800.00 (Age 61 cutoff)");
        assert($item->employer_eps == 0.00, "STRESS-C EPS should be 0.00 (Age 61 cutoff)");
    }
}
echo "PASSED: Initial payroll calculation with EPF/EPS columns correct!\n\n";

echo "--- 3. LOCK PARENT RUN ---\n";
$controller = app(PayrollController::class);
$payrollRun->update(['status' => 'approved']);
$controller->lock($payrollRun->id);

$payrollRun->refresh();
echo "Parent Run Lock Status: {$payrollRun->status}\n";
assert($payrollRun->status === 'locked', "Parent run should be locked");

echo "--- 4. ADD NEW HIRE AFTER LOCK ---\n";
$empD = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => "STD{$rand}",
    'first_name' => 'Dinesh',
    'last_name' => 'NewHire',
    'designation' => 'Junior Analyst',
    'date_of_birth' => '1998-11-20',
    'date_of_joining' => '2026-07-10', // New hire in July 2026
    'basic_pay' => 15000,
    'hra' => 5000,
    'gross_monthly_salary' => 20000,
    'pf_applicable' => true,
    'eps_applicable' => true,
    'esi_applicable' => false,
    'pt_applicable' => true,
    'status' => 'active',
    'pan_number' => "PAN{$rand}D",
    'aadhaar_number' => "8888{$rand}04",
    'bank_account_number' => "2000{$rand}04",
    'bank_ifsc' => 'HDFC0001234',
    'uan_mode' => 'existing_transfer'
]);

foreach ($empD->required_document_types as $docType) {
    EmployeeDocument::create([
        'employee_id' => $empD->id,
        'document_type' => $docType,
        'file_path' => 'documents/test.pdf',
        'status' => 'verified'
    ]);
}

for ($d = 10; $d <= 31; $d++) {
    $dateStr = sprintf('2026-07-%02d', $d);
    AttendanceRecord::create([
        'employee_id' => $empD->id,
        'attendance_date' => $dateStr,
        'status' => 'present',
        'source' => 'live_punch'
    ]);
}
echo "Added New Hire STRESS-D (DOJ 2026-07-10) with attendance records\n";

echo "--- 5. CREATE CORRECTION FOR EMPLOYEE A (Change LOP days from 0 to 5) ---\n";
$itemA = PayrollRunItem::where('payroll_run_id', $payrollRun->id)->where('employee_id', $empA->id)->first();
$correctionSvc = app(PayrollCorrectionService::class);

$preview = $correctionSvc->calculateCorrectionPreview($empA, $payrollRun, 25.0, 5.0);
$corrItem = $correctionSvc->applyCorrection($empA, $payrollRun, $preview, 'LOP Adjustment test');
$suppRun = PayrollRun::find($corrItem->payroll_run_id);

echo "Supplementary Run Created ID: {$suppRun->id}, Status: {$suppRun->status}\n";
echo "  Correction Delta ER EPF: {$corrItem->employer_epf} | Delta ER EPS: {$corrItem->employer_eps} | Net Pay Delta: {$corrItem->net_pay}\n";

$allRunIds = $payrollRun->children()->pluck('id')->prepend($payrollRun->id)->toArray();
$rawItems = DB::table('payroll_run_items')
    ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
    ->whereIn('payroll_run_id', $allRunIds)
    ->select('payroll_run_items.*', 'employees.full_name', 'employees.employee_code')
    ->get();

$consolidated = $correctionSvc->consolidateItemsForDisplay($rawItems);
echo "Consolidated Items Count: " . count($consolidated) . "\n";
foreach ($consolidated as $cons) {
    $empId = is_array($cons) ? $cons['employee_id'] : $cons->employee_id;
    $paidDays = is_array($cons) ? $cons['paid_days'] : $cons->paid_days;
    $grossTotal = is_array($cons) ? $cons['gross_total'] : $cons->gross_total;
    $erEpf = is_array($cons) ? $cons['employer_epf'] : $cons->employer_epf;
    $erEps = is_array($cons) ? $cons['employer_eps'] : $cons->employer_eps;

    if ($empId == $empA->id) {
        echo "  STA Consolidated Paid Days: {$paidDays} | Gross: {$grossTotal} | ER EPF: {$erEpf} | ER EPS: {$erEps}\n";
        assert($paidDays == 25, "Paid days should be 25");
    }
}

echo "--- 6. APPROVE & LOCK SUPPLEMENTARY RUN ---\n";
$suppRun->update(['status' => 'approved']);
$controller->lock($suppRun->id);
$suppRun->refresh();
echo "Supplementary Run Lock Status: {$suppRun->status}\n\n";

echo "--- STEP 4: REAL EDGE CASES & BREAKING ATTEMPTS ---\n";
// Edge Case 1: Locked Upload Guard
$csvContent = "employee_code,days_present,days_lop\n{$empA->employee_code},30,0";
$tmpCsv = __DIR__ . '/locked_upload_test.csv';
file_put_contents($tmpCsv, $csvContent);

$attValSvc = app(\App\Services\AttendanceUploadValidationService::class);
$batchValidation = $attValSvc->validateFile($tmpCsv, $client->id, '2026-07');
unlink($tmpCsv);

$rowStatus = $batchValidation['rows'][0]['status'];
echo "1. Locked Upload Guard Check: status = '{$rowStatus}'\n";
assert($rowStatus === 'blocked_locked', "Locked upload guard must return 'blocked_locked'");

// Edge Case 2: 0-Employee Supplementary Run Prevention
$emptyClient = Client::factory()->create(['company_name' => "Empty Candidate Client {$rand}", 'client_code' => "EMP{$rand}"]);
$emptyBranch = ClientBranch::factory()->create(['client_id' => $emptyClient->id, 'is_head_office' => true]);
$emptyEmp = Employee::factory()->create([
    'client_id' => $emptyClient->id,
    'branch_id' => $emptyBranch->id,
    'employee_code' => "EEMP{$rand}",
    'personal_email' => "eemp{$rand}@example.com",
    'pan_number' => "PAN{$rand}E1",
    'aadhaar_number' => "8888{$rand}E1",
    'bank_account_number' => "2000{$rand}E1",
    'bank_ifsc' => 'HDFC0001234'
]);
foreach ($emptyEmp->required_document_types as $dt) {
    EmployeeDocument::create(['employee_id' => $emptyEmp->id, 'document_type' => $dt, 'file_path' => 'doc.pdf', 'status' => 'verified']);
}
for ($d = 1; $d <= 31; $d++) {
    AttendanceRecord::create(['employee_id' => $emptyEmp->id, 'attendance_date' => sprintf('2026-07-%02d', $d), 'status' => 'present']);
}
$emptyReq = new Request(['client_id' => $emptyClient->id, 'payroll_month' => '2026-07-01']);
$controller->process($emptyReq);
$emptyRun = PayrollRun::where('client_id', $emptyClient->id)->first();
$emptyRun->update(['status' => 'approved']);
$controller->lock($emptyRun->id);

// Now add candidate employee with ZERO attendance
$candEmp = Employee::factory()->create([
    'client_id' => $emptyClient->id,
    'branch_id' => $emptyBranch->id,
    'employee_code' => "CAND{$rand}",
    'personal_email' => "cand{$rand}@example.com",
    'pan_number' => "PAN{$rand}E2",
    'aadhaar_number' => "8888{$rand}E2",
    'bank_account_number' => "2000{$rand}E2",
    'bank_ifsc' => 'HDFC0001234'
]);
foreach ($candEmp->required_document_types as $dt) {
    EmployeeDocument::create(['employee_id' => $candEmp->id, 'document_type' => $dt, 'file_path' => 'doc.pdf', 'status' => 'verified']);
}

// Attempt supplementary run creation
$response = $controller->runSupplementary($emptyRun->id);
$flashError = session('error');
echo "2. 0-Employee Supplementary Prevention Flash: '{$flashError}'\n";
assert(str_contains($flashError, 'Cannot create supplementary run: None of the candidate employees have attendance'), "Must prevent 0-candidate supplementary run");

// Edge Case 3: Canonical PF Check (TEC-088)
$stdClient = Client::factory()->create(['edli_exempted' => false]);
$stdBranch = ClientBranch::factory()->create(['client_id' => $stdClient->id, 'is_head_office' => true]);
$stdEmp = Employee::factory()->create([
    'client_id' => $stdClient->id,
    'branch_id' => $stdBranch->id,
    'employee_code' => "STCAN{$rand}",
    'personal_email' => "stcan{$rand}@example.com",
    'pan_number' => "PAN{$rand}E3",
    'aadhaar_number' => "8888{$rand}E3",
    'bank_account_number' => "2000{$rand}E3",
    'basic_pay' => 15000,
    'pf_applicable' => true,
    'eps_applicable' => true,
    'date_of_birth' => '1995-01-01'
]);
$calcSvc = app(\App\Services\SalaryCalculationService::class);
$calc = $calcSvc->calculateStructuralSalary($stdEmp);
echo "3. Canonical PF Baseline (TEC-088): ₹{$calc['employer_pf_monthly']}\n";
assert($calc['employer_pf_monthly'] == 1950.00, "Canonical PF baseline must equal 1950.00");

echo "\n=== ALL BACKEND CHECKS, STRESS TESTS, AND EDGE CASES PASSED PERFECTLY! ===\n";
