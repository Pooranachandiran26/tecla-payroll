<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Employee;
use App\Models\SalaryRevision;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Find our users and employee
$manager = User::where('role', 'manager')->first() ?? User::factory()->create(['role' => 'manager']);
$admin = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
$employee = Employee::first();

echo "--- STEP 3: MANUAL FLOW (APPROVE PATH) ---\n";
echo "Initial Basic Pay: " . $employee->basic_pay . "\n\n";

// 3a. Submit a real salary revision as manager
auth()->login($manager);
$request = Request::create("/employees/{$employee->id}/salary-revision", 'POST', [
    'new_basic_pay' => $employee->basic_pay + 5000,
    'new_hra' => $employee->hra + 2500,
    'new_conveyance' => 1000,
    'new_da' => 0,
    'new_medical_allowance' => 0,
    'new_special_allowance' => 0,
    'new_other_additions' => 0,
    'effective_date' => date('Y-m-d'),
    'reason_for_revision' => 'Manual Test Revision',
]);
$response = app()->handle($request);

$revision = SalaryRevision::where('employee_id', $employee->id)->latest('id')->first();
echo "3a. Created Revision (status=" . $revision->status . ")\n";
echo "Revision ID: " . $revision->id . "\n";
echo "Old Basic: " . $revision->old_basic_pay . " -> New Basic: " . $revision->new_basic_pay . "\n\n";

// 3b. Show employees table row for that employee
$employeeFresh = Employee::find($employee->id);
echo "3b. Employee Table Basic Pay (Should be unchanged): " . $employeeFresh->basic_pay . "\n\n";

// 3c. Attempt to hit approve endpoint as manager
$requestApproveFail = Request::create("/employees/{$employee->id}/salary-revision/{$revision->id}/approve", 'POST', [
    'action' => 'approve'
]);
$responseApproveFail = app()->handle($requestApproveFail);
echo "3c. Attempt Approve as Manager Response Status: " . $responseApproveFail->getStatusCode() . "\n\n";

// 3d. Log in as admin, approve the same revision
auth()->login($admin);
$requestApprove = Request::create("/employees/{$employee->id}/salary-revision/{$revision->id}/approve", 'POST', [
    'action' => 'approve'
]);
$responseApprove = app()->handle($requestApprove);

$revision->refresh();
echo "3d. Approved Revision (status=" . $revision->status . ")\n";
echo "Approved By: " . $revision->approved_by . "\n";
echo "Approved At: " . $revision->approved_at . "\n\n";

// 3e. Show employees table row again
$employeeFresh2 = Employee::find($employee->id);
echo "3e. Employee Table Basic Pay (Should be updated): " . $employeeFresh2->basic_pay . "\n\n";


echo "--- STEP 4: MANUAL FLOW (REJECT PATH) ---\n";
// Create second revision
auth()->login($manager);
$request2 = Request::create("/employees/{$employee->id}/salary-revision", 'POST', [
    'new_basic_pay' => 999999, // crazy hike
    'new_hra' => 0,
    'new_conveyance' => 0,
    'new_da' => 0,
    'new_medical_allowance' => 0,
    'new_special_allowance' => 0,
    'new_other_additions' => 0,
    'effective_date' => date('Y-m-d'),
    'reason_for_revision' => 'Testing Reject',
]);
app()->handle($request2);

$revision2 = SalaryRevision::where('employee_id', $employee->id)->latest('id')->first();
echo "Created second revision ID: " . $revision2->id . "\n";

auth()->login($admin);
$requestReject = Request::create("/employees/{$employee->id}/salary-revision/{$revision2->id}/approve", 'POST', [
    'action' => 'reject',
    'rejection_reason' => 'Requested hike is too high'
]);
app()->handle($requestReject);

$revision2->refresh();
echo "4. Rejected Revision (status=" . $revision2->status . ")\n";
echo "Rejection Reason: " . $revision2->rejection_reason . "\n";
echo "Employee Table Basic Pay (Should be unchanged from 3e): " . Employee::find($employee->id)->basic_pay . "\n\n";

echo "--- STEP 5: FRONTEND RENDERS REAL DATA ---\n";
// Get the page response
$requestPage = Request::create("/employees/{$employee->id}/salary-revision", 'GET');
// Add inertia headers
$requestPage->headers->set('X-Inertia', 'true');
$responsePage = app()->handle($requestPage);
echo "Page Status Code: " . $responsePage->getStatusCode() . "\n";
$content = json_decode($responsePage->getContent(), true);
echo "Component Rendered: " . $content['component'] . "\n";
echo "Employee Prop (full_name): " . $content['props']['employee']['full_name'] . "\n";
echo "Number of Revisions Passed to Frontend: " . count($content['props']['revisions']) . "\n";
echo "First Revision Status: " . $content['props']['revisions'][0]['status'] . "\n";
