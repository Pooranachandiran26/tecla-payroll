<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');

// 1. Create first employee directly bypassing validation
$emp1 = new \App\Models\Employee();
$emp1->client_id = 1;
$emp1->branch_id = 1;
$emp1->employee_code = 'TEC-001';
$emp1->full_name = 'First Employee';
$emp1->personal_email = 'first@test.com';
$emp1->phone_number = '1111111111';
$emp1->date_of_birth = '1990-01-01';
$emp1->date_of_joining = '2023-01-01';
$emp1->designation = 'Dev';
$emp1->employment_model = 'eor';
$emp1->status = 'active';
$emp1->gender = 'male';
$emp1->marital_status = 'single';
$emp1->residential_address = 'Address';
$emp1->bank_account_number = 'BANK123';
$emp1->bank_name = 'HDFC';
$emp1->bank_branch = 'Mumbai';
$emp1->account_holder_name = 'Name';
$emp1->bank_ifsc = 'HDFC0000060';
$emp1->uan_mode = 'new';
$emp1->pan_number = 'ABCDE1234F'; // The PAN
$emp1->basic_pay = 25000;
$emp1->hra = 0; $emp1->conveyance = 0; $emp1->da = 0; $emp1->medical_allowance = 0; $emp1->special_allowance = 0; $emp1->other_additions = 0;
$emp1->pf_applicable = 1; $emp1->esi_applicable = 1; $emp1->pt_applicable = 1; $emp1->lwf_applicable = 1;
$emp1->tds_regime = 'new'; $emp1->gratuity_mode = 'part_of_ctc';
$emp1->save();

echo "Created Employee 1. PAN Hash: " . $emp1->pan_number_hash . "\n";

// 2. Validate second request
$request = new \App\Http\Requests\StoreEmployeeRequest();
// Bind route manually for testing
$request->setMethod('POST');
$request->merge([
    'client_id' => 1,
    'full_name' => 'Second Employee',
    'personal_email' => 'second@test.com',
    'phone_number' => '2222222222',
    'date_of_birth' => '1990-01-01',
    'date_of_joining' => '2023-01-01',
    'designation' => 'Dev',
    'employment_model' => 'eor',
    'prior_employment_flag' => 0,
    'residential_address' => 'Address',
    'bank_account_number' => 'BANK999',
    'bank_ifsc' => 'HDFC0000060',
    'account_holder_name' => 'Name',
    'pan_number' => 'ABCDE1234F', // SAME PAN
    'uan_mode' => 'new',
    'pf_applicable' => 1,
    'esi_applicable' => 1,
    'tds_applicable' => 1,
    'pt_applicable' => 1,
    'lwf_applicable' => 1,
    'bonus_toggle' => 1,
    'tds_regime' => 'new',
    'gratuity_mode' => 'part_of_ctc',
    'lop_basis_days' => '26',
    'basic_pay' => 25000,
    'hra' => 0,
    'conveyance' => 0,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
]);

// Run Laravel Validator manually with the rules
$validator = \Illuminate\Support\Facades\Validator::make($request->all(), $request->rules());

if ($validator->fails()) {
    echo "VALIDATION FAILED AS EXPECTED!\n";
    echo "Errors:\n";
    print_r($validator->errors()->toArray());
} else {
    echo "VALIDATION PASSED (THIS IS BAD)\n";
}

// Clean up
$emp1->forceDelete();
