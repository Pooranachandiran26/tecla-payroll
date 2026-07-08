<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$requestData = [
    'employee_code' => 'TEST-001',
    'client_id' => 1,
    'branch_id' => 1,
    'full_name' => 'Real POST Employee 2',
    'personal_email' => 'realpost_new2@test.com',
    'phone_number' => '4444444445',
    'date_of_birth' => '1990-01-01',
    'date_of_joining' => '2023-01-01',
    'designation' => 'Dev',
    'employment_model' => 'eor',
    'prior_employment_flag' => false,
    'residential_address' => 'Address',
    'bank_account_number' => 'BANKPOST12345',
    'bank_ifsc' => 'HDFC0000060',
    'account_holder_name' => 'Name',
    'pan_number' => 'QWERT1234V',
    'uan_mode' => 'new',
    'pf_applicable' => true,
    'esi_applicable' => true,
    'tds_applicable' => true,
    'pt_applicable' => true,
    'lwf_applicable' => true,
    'bonus_toggle' => true,
    'tds_regime' => 'new',
    'declarations_accepted' => '1',
    'gratuity_mode' => 'part_of_ctc',
    'lop_basis_days' => '26',
    'basic_pay' => 25000,
    'hra' => 0,
    'conveyance' => 0,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
];

try {
    $emp = \App\Models\Employee::create($requestData);

    $employee = \App\Models\Employee::where('pan_number_hash', hash('sha256', 'QWERT1234V'))->first();

    echo "\n--- FRESH CREATION RAW DB ROW (pan_number, pan_number_hash) ---\n";
    if ($employee) {
        echo "ID: " . $employee->id . "\n";
        echo "PAN (Encrypted): " . $employee->getAttributes()['pan_number'] . "\n";
        echo "PAN HASH: " . $employee->pan_number_hash . "\n";
    } else {
        echo "Employee not created.\n";
    }

} catch (\Exception $e) {
    echo $e->getMessage() . "\n";
}
