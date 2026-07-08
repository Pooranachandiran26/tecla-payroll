<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$console = $app->make(Illuminate\Contracts\Console\Kernel::class);
$console->bootstrap();
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$admin = \App\Models\User::where('email', 'admin@tecla.in')->first();
auth()->login($admin);

$client = \App\Models\Client::where('company_name', 'Synstar Staffing')->first();
$branch = $client->branches()->first();

$employeePayload = [
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    
    // Personal Info
    'full_name' => 'Aditi Verma',
    'date_of_birth' => '1995-05-15', // 18+
    'gender' => 'female',
    'personal_email' => 'aditi.verma.synstar@example.com',
    'phone_number' => '9123456780',
    'residential_address' => '456 Linking Road, Mumbai',
    
    // Employment Info
    'date_of_joining' => date('Y-m-d'),
    'designation' => 'Senior Software Engineer',
    'employee_code' => 'SYN-EMP-001',
    'department' => 'IT',
    'work_location' => 'Mumbai',
    'employment_model' => 'agency_contract',
    'prior_employment_flag' => 0,
    
    // Statutory Info
    'pan_number' => 'ABCDE1234F',
    'aadhaar_number' => '123456789012',
    'uan_number' => '100000000012',
    'esic_number' => '1234567890', 
    'tds_regime' => 'new',
    'gratuity_mode' => 'part_of_ctc',
    'lop_basis_days' => '26',
    
    // Bank Info
    'account_holder_name' => 'Aditi Verma',
    'bank_account_number' => '1234567890',
    'bank_ifsc' => 'HDFC0000001',
    'bank_name' => 'HDFC Bank',
    'bank_branch' => 'Linking Road',
    
    // Earnings (Gross = 25000 + 10000 + 5000 = 40000 > 21000)
    'basic_pay' => 25000,
    'hra' => 10000,
    'conveyance' => 5000,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
    
    // Toggles
    'pf_applicable' => true,
    'esi_applicable' => true, 
    'pt_applicable' => true,
    'status' => 'active',
];

$baseRequest = \Illuminate\Http\Request::create('/employees', 'POST', $employeePayload);
$request = \App\Http\Requests\StoreEmployeeRequest::createFrom($baseRequest);
$request->setContainer($app);
// Manually run validation since Laravel's kernel routing normally does this
$validator = validator($request->all(), $request->rules());
$request->setValidator($validator);
if ($validator->fails()) {
    echo "Validation failed:\n";
    print_r($validator->errors()->toArray());
    exit(1);
}

$controller = $app->make(\App\Http\Controllers\EmployeeController::class);
$response = $controller->store($request);

if ($response->getStatusCode() >= 400) {
    echo "Response Content: " . json_encode($response->getData()) . "\n";
    exit(1);
}

$employee = \App\Models\Employee::where('personal_email', 'aditi.verma.synstar@example.com')->first();
if ($employee) {
    echo "Created employee_id: " . $employee->id . "\n";
    echo "ESI Employer Monthly (MUST BE 0): " . $employee->employer_esi_monthly . "\n";
    echo "ESI Employee Monthly (MUST BE 0): " . $employee->employee_esi_monthly . "\n";
} else {
    echo "Failed to retrieve employee.\n";
}
