<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Http\Controllers\BulkUploadController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

echo "=== REAL TIMING EVIDENCE BENCHMARK (30-ROW BATCH) ===\n";

$client = Client::first();
$branch = ClientBranch::where('client_id', $client->id)->first();
$admin = User::where('role', 'admin')->first();

// Generate 30 valid employee rows
$csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,bank_name,bank_branch,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
$rows = "";
for ($i = 1; $i <= 30; $i++) {
    $code = 'TIMING_' . rand(10000, 99999);
    $email = 'timing_' . $i . '_' . Str::random(5) . '@example.com';
    $phone = '9' . sprintf('%09d', rand(10000000, 99999999));
    $bankAcc = '3000000' . sprintf('%05d', $i);
    $pan = 'ABCDE' . sprintf('%04d', $i) . 'X'; // 5 letters + 4 digits + 1 letter = 10 chars
    $rows .= "{$code},Timing Staff {$i},{$client->client_code},{$email},{$phone},1992-05-10,2023-01-15,Developer,eor,0,1,Test Address,{$bankAcc},HDFC0000001,HDFC Bank,Mumbai,Timing Staff {$i},{$pan},15000,5000,0,0,0,0,0,1,0,1,0,0\n";
}

$tempFilePath = storage_path('app/temp_timing_30.csv');
file_put_contents($tempFilePath, $csvHeader . $rows);

$uploadedFile = new UploadedFile($tempFilePath, 'timing_30.csv', 'text/csv', null, true);

$request = Request::create(route('employees.bulk-upload.execute'), 'POST', [], [], ['file' => $uploadedFile]);
$request->setUserResolver(fn() => $admin);

$startTime = microtime(true);
$controller = app(BulkUploadController::class);
$response = $controller->executeImport($request, app(\App\Services\AuditService::class));
$endTime = microtime(true);

$durationMs = round(($endTime - $startTime) * 1000, 2);

@unlink($tempFilePath);

$responseData = json_decode($response->getContent(), true);

echo "1. executeImport() HTTP Execution Time for 30 Rows: {$durationMs} ms\n";
echo "   Response Code: " . $response->getStatusCode() . "\n";
echo "   Response Content Message: " . ($responseData['message'] ?? json_encode($responseData)) . "\n";

// Verify job in DB queue
$queuedJob = \Illuminate\Support\Facades\DB::table('jobs')->latest('id')->first();
echo "\n2. DATABASE QUEUE CONFIRMATION:\n";
echo "   Queued Job ID: " . ($queuedJob->id ?? 'NONE') . "\n";
echo "   Job Payload Name: " . ($queuedJob ? json_decode($queuedJob->payload, true)['displayName'] : 'NONE') . "\n";

echo "\n✅ TIMING BENCHMARK COMPLETED SUCCESSFULLY!\n";
