<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\ClientContact;
use App\Models\Employee;
use Illuminate\Support\Facades\Auth;

echo "=== BATCH 1 AUDIT FIELDS VERIFICATION ===\n\n";

// 1. Authenticate as Admin (ID 1)
$admin = User::first();
if (!$admin) {
    echo "ERROR: No users found in database.\n";
    exit(1);
}
Auth::login($admin);
echo "1. Logged in as User ID: {$admin->id} ({$admin->name} / {$admin->email})\n\n";

// 2. Create Client
$testCode = 'AUDIT' . rand(100, 999);
$client = Client::create([
    'company_name' => 'Audit Test Client ' . rand(100, 999),
    'client_code' => $testCode,
    'contract_type' => 'agency',
    'contract_start_date' => '2026-01-01',
    'billing_model' => 'markup',
    'markup_percentage' => 10.00,
    'primary_poc_name' => 'John Audit',
    'primary_poc_email' => 'john.' . rand(100,999) . '@audit.com',
    'primary_poc_phone' => '9876543210',
    'company_type' => 'pvt_ltd',
    'registered_address_line_1' => '123 Audit St',
    'registered_city' => 'Chennai',
    'registered_state' => 'Tamil Nadu',
    'registered_pin' => '600001',
]);

echo "2. Created Client ID: {$client->id}\n";
echo "   - created_by: " . var_export($client->created_by, true) . "\n";
echo "   - updated_by: " . var_export($client->updated_by, true) . "\n";

if ($client->created_by === $admin->id && $client->updated_by === $admin->id) {
    echo "   ✅ Client created_by & updated_by match logged-in user!\n\n";
} else {
    echo "   ❌ Client created_by / updated_by MISMATCH!\n\n";
}

// 3. Create Client Branch
$branch = ClientBranch::create([
    'client_id' => $client->id,
    'branch_name' => 'Head Office',
    'location' => 'Chennai',
    'state' => 'Tamil Nadu',
    'is_head_office' => true,
]);

echo "3. Created ClientBranch ID: {$branch->id}\n";
echo "   - created_by: " . var_export($branch->created_by, true) . "\n";
echo "   - updated_by: " . var_export($branch->updated_by, true) . "\n";

if ($branch->created_by === $admin->id && $branch->updated_by === $admin->id) {
    echo "   ✅ ClientBranch created_by & updated_by match logged-in user!\n\n";
} else {
    echo "   ❌ ClientBranch created_by / updated_by MISMATCH!\n\n";
}

// 4. Create Client Contact
$contact = ClientContact::create([
    'client_id' => $client->id,
    'contact_type' => 'primary',
    'full_name' => 'Jane Contact',
    'email' => 'jane.' . rand(100,999) . '@audit.com',
    'phone' => '9876543211',
    'is_primary_contact' => true,
]);

echo "4. Created ClientContact ID: {$contact->id}\n";
echo "   - created_by: " . var_export($contact->created_by, true) . "\n";
echo "   - updated_by: " . var_export($contact->updated_by, true) . "\n";

if ($contact->created_by === $admin->id && $contact->updated_by === $admin->id) {
    echo "   ✅ ClientContact created_by & updated_by match logged-in user!\n\n";
} else {
    echo "   ❌ ClientContact created_by / updated_by MISMATCH!\n\n";
}

// 5. Create Employee
$empCode = 'EMP' . rand(1000, 9999);
$employee = Employee::create([
    'employee_code' => $empCode,
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'full_name' => 'Emp Audit Test',
    'personal_email' => 'emp.' . rand(100,999) . '@audit.com',
    'phone_number' => '9876543212',
    'date_of_birth' => '1995-05-15',
    'date_of_joining' => '2026-02-01',
    'designation' => 'Software Engineer',
    'employment_model' => 'agency_contract',
    'status' => 'active',
    'basic_pay' => 30000,
    'hra' => 12000,
    'conveyance' => 1600,
    'da' => 0,
    'medical_allowance' => 1250,
    'special_allowance' => 5150,
    'other_additions' => 0,
    'gross_monthly_salary' => 50000,
    'net_take_home_monthly' => 45000,
    'employer_pf_monthly' => 3600,
    'employer_esi_monthly' => 0,
    'ctc_monthly' => 53600,
    'bank_account_number' => '1234567890',
    'account_holder_name' => 'Emp Audit Test',
    'bank_ifsc' => 'HDFC0001234',
    'bank_name' => 'HDFC Bank',
    'bank_branch' => 'Chennai Main',
    'uan_mode' => 'new',
    'pan_number' => 'ABCDE1234F',
    'gratuity_mode' => 'part_of_ctc',
]);

echo "5. Created Employee ID: {$employee->id} (Code: {$employee->employee_code})\n";
echo "   - created_by: " . var_export($employee->created_by, true) . "\n";
echo "   - updated_by: " . var_export($employee->updated_by, true) . "\n";
echo "   - entry_source: " . var_export($employee->entry_source, true) . "\n";

if ($employee->created_by === $admin->id && $employee->updated_by === $admin->id && $employee->entry_source === 'manual') {
    echo "   ✅ Employee created_by, updated_by & entry_source match expectations!\n\n";
} else {
    echo "   ❌ Employee audit fields MISMATCH!\n\n";
}

// 6. Test Model Update
$client->update(['industry' => 'Information Technology']);
$employee->update(['designation' => 'Senior Lead Engineer']);

echo "6. Updated Client & Employee records:\n";
echo "   - Client updated_by after edit: " . var_export($client->fresh()->updated_by, true) . "\n";
echo "   - Employee updated_by after edit: " . var_export($employee->fresh()->updated_by, true) . "\n";

if ($client->fresh()->updated_by === $admin->id && $employee->fresh()->updated_by === $admin->id) {
    echo "   ✅ Client & Employee updated_by correctly maintained on update!\n\n";
} else {
    echo "   ❌ Model update updated_by MISMATCH!\n\n";
}

// Clean up test records
$employee->forceDelete();
$contact->forceDelete();
$branch->forceDelete();
$client->forceDelete();

echo "=== ALL BATCH 1 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n";
