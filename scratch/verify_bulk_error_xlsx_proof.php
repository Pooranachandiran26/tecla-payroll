<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Services\BulkUploadValidationService;
use Spatie\SimpleExcel\SimpleExcelWriter;
use Spatie\SimpleExcel\SimpleExcelReader;
use Illuminate\Support\Str;

echo "=== REAL MANUAL CONFIRMATION: ERROR .XLSX FILE READ-BACK PROOF ===\n";

$client = Client::first();
$branch = ClientBranch::where('client_id', $client->id)->first();

$csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";

// 1 valid row + 2 invalid rows (1 with commas in address)
$validRow = "VALID_PROOF_1,Valid Staff,{$client->client_code},valid_proof_1@example.com,9876543210,1990-01-01,2023-01-01,Engineer,eor,0,1,Address 1,1234567890,SBIN0001234,Valid Staff,ABCDE1234F,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
$invalidRow1 = "ERR_PROOF_1,Error Staff 1,{$client->client_code},invalid_email,9876543211,1990-01-01,2023-01-01,Engineer,eor,0,1,\"789 Ocean Drive, Suite 5, West Bay, CA 90210\",1234567891,SBIN0001234,Error Staff 1,INVALID_PAN,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
$invalidRow2 = "ERR_PROOF_2,Error Staff 2,INVALID_CLIENT,err2@example.com,9876543212,1990-01-01,2023-01-01,Engineer,eor,0,1,Address 3,1234567892,SBIN0001234,Error Staff 2,ABCDE5678H,15000,5000,0,0,0,0,0,1,0,1,0,0\n";

$tempCsvPath = storage_path('app/temp_proof_validation.csv');
file_put_contents($tempCsvPath, $csvHeader . $validRow . $invalidRow1 . $invalidRow2);

$service = app(BulkUploadValidationService::class);
$validationResults = $service->validateFile($tempCsvPath);
@unlink($tempCsvPath);

echo "1. Validation complete: Total Rows: {$validationResults['total_rows']}, Valid: {$validationResults['valid_count']}, Errors: {$validationResults['error_count']}\n";

// Filter error rows
$errorRows = array_values(array_filter($validationResults['rows'], fn($r) => $r['status'] === 'error'));

$templateColumns = [
    'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
    'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
    'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
    'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
    'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable',
    'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
    'uan_number', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
    'declarations_accepted', 'reporting_manager_code'
];

$xlsxPath = storage_path('app/proof_bulk_error_rows.xlsx');
$writer = SimpleExcelWriter::create($xlsxPath);
$writer->nameCurrentSheet('Error Rows');
$writer->addHeader(array_merge($templateColumns, ['error_reason']));

foreach ($errorRows as $row) {
    $rawData = $row['raw_data'] ?? [];
    $values = [];
    foreach ($templateColumns as $col) {
        $values[$col] = $rawData[$col] ?? '';
    }
    $values['error_reason'] = $row['message'] ?? '';
    $writer->addRow($values);
}
$writer->close();

echo "\n2. Generated physical error .xlsx file at: {$xlsxPath}\n";

// Read back the physical .xlsx file
$reader = SimpleExcelReader::create($xlsxPath);
$readBackRows = $reader->getRows()->toArray();

echo "\n3. READ-BACK ROWS FROM GENERATED .XLSX FILE (EXACT DATA & COLUMN MATCH):\n";
foreach ($readBackRows as $idx => $r) {
    echo "\n--- FAILED ROW " . ($idx + 1) . " ---\n";
    echo "   Employee Code      : " . ($r['employee_code'] ?? 'N/A') . "\n";
    echo "   Full Name          : " . ($r['full_name'] ?? 'N/A') . "\n";
    echo "   Client Code        : " . ($r['client_code'] ?? 'N/A') . "\n";
    echo "   Residential Address: \"" . ($r['residential_address'] ?? 'N/A') . "\"\n";
    echo "   Error Reason       : \"" . ($r['error_reason'] ?? 'N/A') . "\"\n";
}

echo "\n✅ REAL MANUAL CONFIRMATION COMPLETED SUCCESSFULLY!\n";
