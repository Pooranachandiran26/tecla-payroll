<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = new \App\Http\Requests\StoreClientRequest();
$data = [
    'company_name' => 'Test 1 Loc',
    'client_code' => 'T1LOC',
    'company_type' => 'pvt_ltd',
    'pan_number' => 'ABCDE1234F',
    'gstin' => '27ABCDE1234F1Z5',
    'registered_address_line_1' => '123 Test St',
    'registered_city' => 'Mumbai',
    'registered_state' => 'Maharashtra',
    'registered_pin' => '400001',
    'contract_type' => 'agency',
    'billing_model' => 'markup',
    'markup_percentage' => 10,
    'contract_start_date' => '2024-01-01',
    'contacts' => [
        [
            'contact_type' => 'primary',
            'full_name' => 'POC',
            'email' => 'poc@example.com',
            'phone' => '9999999999'
        ]
    ],
    'work_locations_count' => 1
];
$request->merge($data);
$validator = \Illuminate\Support\Facades\Validator::make($request->all(), $request->rules());
if ($validator->fails()) {
    dump('Validation Failed', $validator->errors()->toArray());
} else {
    dump('Validation Passed');
    // Simulate what the controller does
    $client = \App\Models\Client::create($data);
    dump('Client branches count:', $client->branches()->count());
}
