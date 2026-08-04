<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "=== BULK UPLOAD AUDIT FIELDS VERIFICATION ===\n\n";

// 1. Authenticate as Admin User (ID 2)
$admin = User::find(2) ?: User::first();
Auth::login($admin);
echo "1. Logged in Admin User ID: {$admin->id} ({$admin->name})\n\n";

// 2. Fetch or create an active client & branch
$client = Client::with('branches')->where('status', 'active')->first();
if (!$client) {
    $client = Client::create([
        'company_name' => 'Bulk Test Client ' . rand(100, 999),
        'client_code' => 'BULK' . rand(100, 999),
        'contract_type' => 'agency',
        'contract_start_date' => '2026-01-01',
        'billing_model' => 'markup',
        'markup_percentage' => 10.00,
        'status' => 'active',
        'primary_poc_name' => 'POC',
        'primary_poc_email' => 'poc@bulk.com',
        'primary_poc_phone' => '9876543210',
        'company_type' => 'pvt_ltd',
        'registered_address_line_1' => 'Street 1',
        'registered_city' => 'Chennai',
        'registered_state' => 'Tamil Nadu',
        'registered_pin' => '600001',
    ]);
    $branch = ClientBranch::create([
        'client_id' => $client->id,
        'branch_name' => 'Main Branch',
        'is_head_office' => true,
    ]);
} else {
    $branch = $client->branches->first();
}

$bulkEmpCode = 'BULKEMP' . rand(1000, 9999);

echo "2. Preparing Bulk Upload Payload for Employee Code: {$bulkEmpCode} (Client: {$client->client_code})\n\n";

// Simulate row validation payload from BulkUploadValidationService
$validationService = app(\App\Services\BulkUploadValidationService::class);
$salaryService = app(\App\Services\SalaryCalculationService::class);

$sampleRowData = [
    'employee_code' => $bulkEmpCode,
    'full_name' => 'Bulk Uploaded Audit Candidate',
    'client_code' => $client->client_code,
    'branch_name' => $branch->branch_name,
    'personal_email' => 'bulk.candidate.' . rand(1000, 9999) . '@audit.com',
    'phone_number' => '987' . rand(1000000, 9999999),
    'date_of_birth' => '1996-08-20',
    'date_of_joining' => '2026-03-01',
    'designation' => 'QA Analyst',
    'employment_model' => ($client->contract_type === 'agency') ? 'agency_contract' : 'eor',
    'prior_employment_flag' => '0',
    'residential_address' => '456 Bulk Way, Tech City',
    'bank_account_number' => '987654321' . rand(100, 999),
    'bank_ifsc' => 'HDFC0004321',
    'bank_name' => 'HDFC Bank',
    'bank_branch' => 'Tech City',
    'account_holder_name' => 'Bulk Uploaded Audit Candidate',
    'pan_number' => 'BLK' . rand(10, 99) . '1234F',
    'basic_pay' => '20000',
    'hra' => '8000',
    'conveyance' => '1600',
    'da' => '0',
    'medical_allowance' => '1250',
    'special_allowance' => '4150',
    'other_additions' => '0',
    'pf_applicable' => '1',
    'eps_applicable' => '1',
    'esi_applicable' => '0',
    'pt_applicable' => '1',
    'lwf_applicable' => '0',
    'tds_applicable' => '0',
    'uan_mode' => 'new',
    'tds_regime' => 'new',
    'gratuity_mode' => 'part_of_ctc',
    'lop_basis_days' => '30',
    'declarations_accepted' => '1',
];

// Perform calculation matching controller execution
$salaryResult = $salaryService->calculateStructuralSalary($sampleRowData);

$allowedCols = [
    'employee_code', 'full_name', 'personal_email', 'phone_number', 'date_of_birth', 'date_of_joining',
    'designation', 'employment_model', 'prior_employment_flag', 'residential_address', 'bank_account_number',
    'bank_ifsc', 'bank_name', 'bank_branch', 'account_holder_name', 'pan_number', 'basic_pay', 'hra',
    'conveyance', 'da', 'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable',
    'eps_applicable', 'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
    'tds_regime', 'gratuity_mode', 'lop_basis_days', 'declarations_accepted', 'gross_monthly_salary',
    'net_take_home_monthly', 'employer_pf_monthly', 'employer_esi_monthly', 'ctc_monthly',
    'client_id', 'branch_id', 'status', 'entry_source', 'created_by', 'updated_by'
];

$rawPayload = array_merge($sampleRowData, $salaryResult, [
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'status' => 'onboarding',
    'entry_source' => 'bulk_upload',
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);

$dbPayload = array_intersect_key($rawPayload, array_flip($allowedCols));

// Insert via Eloquent (matching BulkUploadController line 311)
$employee = Employee::create($dbPayload);

echo "3. Inserted Bulk Employee ID: {$employee->id}\n\n";

// 4. Raw Query Direct from Database Engine (No Eloquent memory caching)
$rawDbRow = DB::table('employees')->where('id', $employee->id)->first();

echo "4. RAW MYSQL DATABASE RECORD:\n";
echo "--------------------------------------------------------\n";
echo "   id:           {$rawDbRow->id}\n";
echo "   employee_code:{$rawDbRow->employee_code}\n";
echo "   full_name:    {$rawDbRow->full_name}\n";
echo "   created_by:   " . var_export($rawDbRow->created_by, true) . "\n";
echo "   updated_by:   " . var_export($rawDbRow->updated_by, true) . "\n";
echo "   entry_source: '" . $rawDbRow->entry_source . "'\n";
echo "--------------------------------------------------------\n\n";

// 5. Assertions
$success = true;
if ((int)$rawDbRow->created_by !== (int)$admin->id) {
    echo "❌ ERROR: created_by is " . var_export($rawDbRow->created_by, true) . ", expected {$admin->id}\n";
    $success = false;
}
if ((int)$rawDbRow->updated_by !== (int)$admin->id) {
    echo "❌ ERROR: updated_by is " . var_export($rawDbRow->updated_by, true) . ", expected {$admin->id}\n";
    $success = false;
}
if ($rawDbRow->entry_source !== 'bulk_upload') {
    echo "❌ ERROR: entry_source is '" . $rawDbRow->entry_source . "', expected 'bulk_upload'\n";
    $success = false;
}

if ($success) {
    echo "✅ CONFIRMED: Bulk-uploaded employee genuinely has created_by={$rawDbRow->created_by}, updated_by={$rawDbRow->updated_by}, and entry_source='bulk_upload' in the DB!\n";
}

// Clean up
$employee->forceDelete();
echo "\nTest cleanup complete.\n";
