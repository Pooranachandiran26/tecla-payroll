<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$client = \App\Models\Client::first();

$employee = \App\Models\Employee::create([
    'employee_code' => 'TEC-998',
    'client_id' => $client->id,
    'branch_id' => $client->branches()->first()->id,
    'full_name' => 'Test Employee Gender 4',
    'personal_email' => 'test_gender4@example.com',
    'phone_number' => '1234567894',
    'emergency_contact_phone' => '0987654321',
    'gender' => 'female',
    'blood_group' => 'O+',
    'marital_status' => 'married',
    'date_of_birth' => '1995-01-01',
    'date_of_joining' => '2026-07-01',
    'designation' => 'Developer',
    'employment_model' => 'eor',
    'prior_employment_flag' => false,
    'residential_address' => '123 Test St',
    'bank_account_number' => '1234567894',
    'bank_ifsc' => 'TEST0001234',
    'bank_name' => 'Test Bank',
    'bank_branch' => 'Test Branch',
    'account_holder_name' => 'Test Employee',
    'pan_number' => 'ABCDE1238F',
    'aadhaar_number' => '123456789018',
    'uan_mode' => 'new',
    'uan_number' => '',
    'esic_number' => '',
    'basic_pay' => 15000,
    'hra' => 5000,
    'conveyance' => 1600,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
    'pf_applicable' => true,
    'esi_applicable' => false,
    'pt_applicable' => true,
    'pt_deduction_override' => 200,
    'lwf_applicable' => false,
    'tds_regime' => 'new',
    'tds_applicable' => false,
    'gratuity_mode' => 'part_of_ctc',
    'lop_basis_days' => '30',
    'bonus_toggle' => false,
    'declarations_accepted' => true,
    'employer_pf_monthly' => 0,
    'employer_esi_monthly' => 0,
    'ctc_monthly' => 0,
    'status' => 'onboarding',
]);

$emp = \App\Models\Employee::where('personal_email', 'test_gender4@example.com')->first();
if ($emp) {
    echo "DB Row - Gender: " . $emp->gender . "\n";
    echo "DB Row - Blood Group: " . $emp->blood_group . "\n";
    echo "DB Row - Marital Status: " . $emp->marital_status . "\n";
} else {
    echo "Employee not found in DB.\n";
}
