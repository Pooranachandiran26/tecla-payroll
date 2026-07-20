<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

use App\Models\Employee;
use App\Models\User;
use App\Models\Client;
use App\Models\BankChangeRequest;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\BankChangeRequestController;
use Illuminate\Http\Request;

echo "--- STARTING TESTS ---\n";

// 1. Create Employee (Test NotifyWatchersJob)
$client = Client::first();
$data = [
    'full_name' => 'Test Email Employee',
    'personal_email' => 'test@example.com',
    'phone_number' => '1234567890',
    'client_id' => $client->id,
    'employment_model' => 'full-time',
    'status' => 'onboarding'
];
$adminUser = User::where('role', 'admin')->first();
auth()->login($adminUser);

$empController = new EmployeeController();
$req = Request::create('/employees', 'POST', $data);
$req->setContainer($app);
$empController->store($req);

$employee = Employee::where('personal_email', 'test@example.com')->orderBy('id', 'desc')->first();
echo "1. Created Employee ID: {$employee->id}. NotifyWatchersJob should be queued.\n";

// 2. Auto-Activation (Test ProfileActivatedMail)
// Fake documents required = 1, verified = 1
$employee->update(['documents_required_count' => 1, 'documents_verified_count' => 1]);
$reqActivate = Request::create("/employees/{$employee->id}/documents/999/verify", 'POST', ['status' => 'verified']);
// We can't easily call verifyDocument without a real document, let's just create one.
$doc = \App\Models\EmployeeDocument::create([
    'employee_id' => $employee->id,
    'document_type' => 'pan_card',
    'file_path' => 'dummy',
    'status' => 'pending'
]);
$reqActivate = Request::create("/employees/{$employee->id}/documents/{$doc->id}/verify", 'POST', ['status' => 'verified']);
$reqActivate->setContainer($app);
$empController->verifyDocument($reqActivate, $employee->id, $doc->id);
$employee->refresh();
echo "2. Verified Doc. Employee status is now: {$employee->status}. ProfileActivatedMail should be queued.\n";

// 3. Request Bank Change (Test NotifyWatchersJob)
// login as employee
$empUser = User::where('employee_id', $employee->id)->first();
auth()->login($empUser);

$bankController = new BankChangeRequestController();
$bankReqData = [
    'new_bank_account_number' => '123456789',
    'new_bank_account_number_confirmation' => '123456789',
    'new_bank_ifsc' => 'HDFC0001234',
    'new_account_holder_name' => 'Test Name',
    'reason' => 'Testing emails'
];
$bankReq = Request::create('/employee/bank-change', 'POST', $bankReqData);
$bankReq->setContainer($app);
$bankController->store($bankReq);

$bankChange = BankChangeRequest::where('employee_id', $employee->id)->first();
echo "3. Created Bank Request ID: {$bankChange->id}. NotifyWatchersJob should be queued.\n";

// 4. Approve Bank Request (Test BankChangeApprovedMail)
auth()->login($adminUser);
$approveReq = Request::create("/bank-change-requests/{$bankChange->id}/approve", 'POST');
$approveReq->setContainer($app);
$bankController->approve($approveReq, $bankChange->id);
echo "4. Approved Bank Request. BankChangeApprovedMail should be queued.\n";

// Create another request to test reject
$employee->update(['bank_account_hash' => null]); // reset hash constraint
auth()->login($empUser);
$bankController->store($bankReq);
$bankChange2 = BankChangeRequest::where('employee_id', $employee->id)->where('status', 'pending')->first();

auth()->login($adminUser);
$rejectReq = Request::create("/bank-change-requests/{$bankChange2->id}/reject", 'POST', ['rejection_reason' => 'Invalid IFSC code']);
$rejectReq->setContainer($app);
$bankController->reject($rejectReq, $bankChange2->id);
echo "5. Rejected Bank Request. BankChangeRejectedMail should be queued.\n";

// Dump queued jobs
echo "\n--- JOBS IN QUEUE (should see 5 mail/notification jobs) ---\n";
$jobs = DB::table('jobs')->get();
foreach($jobs as $job) {
    $payload = json_decode($job->payload);
    echo "- Job: " . $payload->displayName . "\n";
}

echo "Done.\n";
