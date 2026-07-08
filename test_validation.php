<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$clients = App\Models\Client::with('branches')->get();
$firstClient = $clients->first();
$multiBranchClient = $clients->first(fn($c) => $c->branches->count() > 1);

$emp = App\Models\Employee::first();
$existingPan = 'ABCDE1234F'; // Will use a fixed test value
if ($emp) {
    // Generate a PAN and hash it to assign to an existing employee for testing
    $emp->pan_number_hash = hash('sha256', $existingPan);
    $emp->save();
}

$csv = <<<CSV
employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,tds_regime,gratuity_mode,lop_basis_days,branch_name,esic_number
EMP001,John Doe,{$firstClient->client_code},john1@example.com,9999999901,1990-01-01,2023-01-01,Dev,eor,0,123 St,ACC1001,HDFC0001234,John,ZZZZZ9999Z,50000,20000,5000,0,5000,0,0,new,part_of_ctc,26,,1234567890
EMP002,Jane Doe,{$firstClient->client_code},jane2@example.com,9999999902,1990-01-01,2023-01-01,Dev,eor,0,123 St,ACC1002,HDFC0001234,Jane,{$existingPan},50000,20000,5000,0,5000,0,0,new,part_of_ctc,26,,1234567890
EMP003,Bob Smith,{$firstClient->client_code},bob3@example.com,9999999903,1990-01-01,2023-01-01,Dev,eor,0,123 St,ACC1003,HDFC0001234,Bob,AAAAA1111A,50000,20000,5000,0,5000,0,0,new,part_of_ctc,26,,1234567890
EMP004,Alice Jones,{$firstClient->client_code},alice4@example.com,9999999904,1990-01-01,2023-01-01,Dev,eor,0,123 St,ACC1004,HDFC0001234,Alice,AAAAA1111A,50000,20000,5000,0,5000,0,0,new,part_of_ctc,26,,1234567890
EMP005,Fake Client,FAKECODE,fake5@example.com,9999999905,1990-01-01,2023-01-01,Dev,eor,0,123 St,ACC1005,HDFC0001234,Fake,BBBBB2222B,50000,20000,5000,0,5000,0,0,new,part_of_ctc,26,,1234567890
EMP006,Multi Branch,SYN-809,multi6@example.com,9999999906,1990-01-01,2023-01-01,Dev,eor,0,123 St,ACC1006,HDFC0001234,Multi,CCCCC3333C,50000,20000,5000,0,5000,0,0,new,part_of_ctc,26,,1234567890
CSV;

file_put_contents('test_bulk.csv', $csv);

$service = app()->make(App\Services\BulkUploadValidationService::class);
$result = $service->validateFile(base_path('test_bulk.csv'));

echo "Validation output:\n";
print_r($result);
