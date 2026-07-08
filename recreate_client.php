<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$console = $app->make(Illuminate\Contracts\Console\Kernel::class);
$console->bootstrap();
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$admin = \App\Models\User::where('email', 'admin@tecla.in')->first();
auth()->login($admin);

$clientPayload = [
    'company_name' => 'Synstar Staffing',
    'client_code' => 'SYN-STAFF-01',
    'company_type' => 'pvt_ltd',
    'gstin' => '27AAPFU0939F1Z5', // Real format valid GSTIN for Maharashtra
    'contract_type' => 'agency',
    'contract_start_date' => date('Y-m-d'),
    'billing_model' => 'markup',
    'markup_percentage' => 15.00,
    
    // Address
    'registered_address_line_1' => '123 Tech Park',
    'registered_city' => 'Mumbai',
    'registered_state' => 'Maharashtra',
    'registered_pin' => '400001',
    'work_locations_count' => '1',
    
    // POC
    'primary_poc_name' => 'Rajesh Sharma',
    'primary_poc_email' => 'rajesh@synstar.com',
    'primary_poc_phone' => '9876543210',
    'contacts' => [
        [
            'contact_type' => 'primary',
            'full_name' => 'Rajesh Sharma',
            'email' => 'rajesh@synstar.com',
            'phone' => '9876543210',
            'designation' => 'HR Manager'
        ]
    ],
    
    // Statutory defaults
    'pf_applicable' => true,
    'esi_applicable' => true,
    'esi_limit' => 21000,
    'lop_basis_days' => '26',
    'default_gratuity_mode' => 'ctc_included',
    'status' => 'active',
];

$baseRequest = \Illuminate\Http\Request::create('/clients', 'POST', $clientPayload);
$request = \App\Http\Requests\StoreClientRequest::createFrom($baseRequest);
$request->setContainer($app);
// Manually run validation since Laravel's kernel routing normally does this
$validator = validator($request->all(), $request->rules());
$request->setValidator($validator);
if ($validator->fails()) {
    echo "Validation failed:\n";
    print_r($validator->errors()->toArray());
    exit(1);
}

$controller = $app->make(\App\Http\Controllers\ClientController::class);
$response = $controller->store($request);

if ($response->getStatusCode() >= 400) {
    echo "Response Content: " . json_encode($response->getData()) . "\n";
    exit(1);
}

$client = \App\Models\Client::where('company_name', 'Synstar Staffing')->first();
if ($client) {
    echo "Created client_id: " . $client->id . "\n";
    echo "Client Record:\n";
    print_r($client->toArray());
    
    // Check branch synthesis
    $branch = $client->branches()->first();
    echo "Branch Synthesis:\n";
    if ($branch) {
        print_r($branch->toArray());
    } else {
        echo "NO BRANCH CREATED.\n";
    }
} else {
    echo "Failed to retrieve client.\n";
}
