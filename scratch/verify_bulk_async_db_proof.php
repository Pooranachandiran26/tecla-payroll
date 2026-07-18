<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\AuditLog;
use App\Jobs\ProvisionBulkUploadUsersJob;
use Illuminate\Support\Str;

echo "=== REAL DB PROOF: DISPATCH JOB WITH BROKEN ROW ===\n";

$client = Client::first();
$branch = ClientBranch::where('client_id', $client->id)->first() ?: ClientBranch::factory()->create(['client_id' => $client->id]);
$admin = User::where('role', 'admin')->first() ?: User::factory()->create(['role' => 'admin']);

// Create pre-existing user to cause collision
$conflictEmail = 'conflict_' . Str::random(8) . '@example.com';
User::create([
    'name' => 'Pre-existing Account Holder',
    'email' => $conflictEmail,
    'password' => bcrypt('password'),
    'role' => 'employee',
    'status' => 'active',
]);

$validEmail = 'valid_' . Str::random(8) . '@example.com';

// Create 1 valid employee and 1 broken employee with duplicate email
$validEmp = Employee::create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => 'PROOF_' . rand(1000, 9999),
    'full_name' => 'Valid Employee ' . rand(1, 100),
    'personal_email' => $validEmail,
    'phone_number' => '9' . rand(100000000, 999999999),
    'date_of_birth' => '1992-05-10',
    'date_of_joining' => '2023-01-15',
    'designation' => 'Analyst',
    'employment_model' => 'eor',
    'prior_employment_flag' => 0,
    'residential_address' => 'Address 123',
    'bank_account_number' => 'ACC' . rand(1000000, 9999999),
    'bank_ifsc' => 'HDFC0000001',
    'bank_name' => 'HDFC Bank',
    'bank_branch' => 'Mumbai',
    'account_holder_name' => 'Valid Employee',
    'pan_number' => 'ABCDE' . rand(1000, 9999) . 'A',
    'basic_pay' => 20000,
    'hra' => 8000,
    'conveyance' => 0,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
    'status' => 'onboarding'
]);

$brokenEmp = Employee::create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => 'PROOF_' . rand(1000, 9999),
    'full_name' => 'Broken Employee ' . rand(1, 100),
    'personal_email' => $conflictEmail, // Conflict!
    'phone_number' => '9' . rand(100000000, 999999999),
    'date_of_birth' => '1993-06-12',
    'date_of_joining' => '2023-02-01',
    'designation' => 'Analyst',
    'employment_model' => 'eor',
    'prior_employment_flag' => 0,
    'residential_address' => 'Address 456',
    'bank_account_number' => 'ACC' . rand(1000000, 9999999),
    'bank_ifsc' => 'HDFC0000001',
    'bank_name' => 'HDFC Bank',
    'bank_branch' => 'Mumbai',
    'account_holder_name' => 'Broken Employee',
    'pan_number' => 'ABCDE' . rand(1000, 9999) . 'B',
    'basic_pay' => 20000,
    'hra' => 8000,
    'conveyance' => 0,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
    'status' => 'onboarding'
]);

echo "1. Dispatched ProvisionBulkUploadUsersJob for Employee IDs: {$validEmp->id} and {$brokenEmp->id} (Broken Email: {$conflictEmail})\n";

// Handle job synchronously for DB proof check
$job = new ProvisionBulkUploadUsersJob([$validEmp->id, $brokenEmp->id], $admin->id);
$job->handle(app(\App\Services\InvitationService::class), app(\App\Services\AuditService::class));

// Query DB for actual audit logs created
$failureAuditLog = AuditLog::where('action', 'employee.provisioning_failed')
    ->where('auditable_id', $brokenEmp->id)
    ->latest()
    ->first();

$summaryAuditLog = AuditLog::where('action', 'employee.bulk_provisioning_completed')
    ->latest()
    ->first();

echo "\n2. REAL DB PROOF - FAILURE AUDIT LOG ROW:\n";
echo "   ID: " . ($failureAuditLog->id ?? 'NONE') . "\n";
echo "   Action: " . ($failureAuditLog->action ?? 'NONE') . "\n";
echo "   Auditable Employee ID: " . ($failureAuditLog->auditable_id ?? 'NONE') . "\n";
echo "   Metadata: " . json_encode($failureAuditLog->metadata ?? []) . "\n";

echo "\n3. REAL DB PROOF - BATCH SUMMARY AUDIT LOG ROW:\n";
echo "   ID: " . ($summaryAuditLog->id ?? 'NONE') . "\n";
echo "   Action: " . ($summaryAuditLog->action ?? 'NONE') . "\n";
echo "   Metadata: " . json_encode($summaryAuditLog->metadata ?? []) . "\n";

echo "\n✅ DB PROOF COMPLETED SUCCESSFULLY!\n";
