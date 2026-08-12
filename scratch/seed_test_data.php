<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;

echo "--- Disabling Global & Client-Level 2FA for Test Suite ---\n";
SettingsService::set('auth_security.otp_enabled', false);
Cache::flush();

$clientAttributes = [
    'contract_type' => 'eor',
    'contract_start_date' => '2026-01-01',
    'billing_model' => 'markup',
    'status' => 'active',
    'primary_poc_name' => 'Test POC',
    'primary_poc_email' => 'poc@test.local',
    'primary_poc_phone' => '9876543210',
    'company_type' => 'pvt_ltd',
    'registered_address_line_1' => 'Test Line 1',
    'registered_city' => 'Bangalore',
    'registered_state' => 'Karnataka',
    'registered_pin' => '560001',
    'portal_require_2fa' => false,
];

// 1. Client A & Client B
$clientA = Client::updateOrCreate(
    ['client_code' => 'CLT-TEST-A'],
    array_merge($clientAttributes, [
        'company_name' => 'Test Client A',
    ])
);

$clientB = Client::updateOrCreate(
    ['client_code' => 'CLT-TEST-B'],
    array_merge($clientAttributes, [
        'company_name' => 'Test Client B',
    ])
);

echo "Client A ID: {$clientA->id}\n";
echo "Client B ID: {$clientB->id}\n";

// 2. Super Admin User
$superAdmin = User::updateOrCreate(
    ['email' => 'superadmin@test.local'],
    [
        'name' => 'Super Admin Test User',
        'password' => Hash::make('TestPassword123!'),
        'role' => 'admin',
        'status' => 'active',
        'must_change_password' => false,
    ]
);
echo "Super Admin ID: {$superAdmin->id}\n";

// 3. Client A Admin User
$clientAdminA = User::updateOrCreate(
    ['email' => 'clientadmina@test.local'],
    [
        'name' => 'Client A Admin',
        'password' => Hash::make('TestPassword123!'),
        'role' => 'client',
        'client_id' => $clientA->id,
        'status' => 'active',
        'must_change_password' => false,
    ]
);
echo "Client A Admin ID: {$clientAdminA->id}\n";

// 4. Client B Admin User
$clientAdminB = User::updateOrCreate(
    ['email' => 'clientadminb@test.local'],
    [
        'name' => 'Client B Admin',
        'password' => Hash::make('TestPassword123!'),
        'role' => 'client',
        'client_id' => $clientB->id,
        'status' => 'active',
        'must_change_password' => false,
    ]
);
echo "Client B Admin ID: {$clientAdminB->id}\n";

$empAttributes = [
    'date_of_birth' => '1995-05-15',
    'date_of_joining' => '2026-01-01',
    'designation' => 'Software Engineer',
    'employment_model' => 'eor',
    'basic_pay' => 30000,
    'hra' => 15000,
    'conveyance' => 2000,
    'da' => 0,
    'medical_allowance' => 1500,
    'special_allowance' => 5000,
    'gross_monthly_salary' => 53500,
    'net_take_home_monthly' => 48000,
    'employer_pf_monthly' => 3600,
    'employer_esi_monthly' => 0,
    'ctc_monthly' => 57100,
    'account_holder_name' => 'Test Account Holder',
    'bank_ifsc' => 'SBIN0001234',
    'bank_name' => 'State Bank of India',
    'bank_branch' => 'Bangalore Main Branch',
    'branch_id' => 1,
    'status' => 'active',
];

// 5. Test Employee for Client A
$empA = Employee::updateOrCreate(
    ['employee_code' => 'EMP-TEST-A'],
    array_merge($empAttributes, [
        'first_name' => 'Alice',
        'last_name' => 'ClientA',
        'full_name' => 'Alice ClientA',
        'personal_email' => 'alice@clienta.local',
        'phone_number' => '9876543211',
        'bank_account_number' => '123456789011',
        'pan_number' => 'ABCDE1234A',
        'client_id' => $clientA->id,
    ])
);
echo "Employee A ID: {$empA->id}\n";

// 6. Test Employee for Client B
$empB = Employee::updateOrCreate(
    ['employee_code' => 'EMP-TEST-B'],
    array_merge($empAttributes, [
        'first_name' => 'Bob',
        'last_name' => 'ClientB',
        'full_name' => 'Bob ClientB',
        'personal_email' => 'bob@clientb.local',
        'phone_number' => '9876543212',
        'bank_account_number' => '123456789012',
        'pan_number' => 'ABCDE1234B',
        'client_id' => $clientB->id,
    ])
);
echo "Employee B ID: {$empB->id}\n";

echo "--- Seeding Completed Successfully ---\n";
