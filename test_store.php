<?php
Auth::login(\App\Models\User::first());
$req = \App\Http\Requests\StoreClientRequest::create('/clients', 'POST', [
    'company_name' => 'Test Corp',
    'client_code' => 'TEST002',
    'company_type' => 'pvt_ltd',
    'status' => 'onboarding',
    'registered_address_line_1' => '123 Main',
    'registered_city' => 'Metropolis',
    'registered_state' => 'New York',
    'registered_pin' => '100001',
    'contract_type' => 'agency',
    'billing_model' => 'markup',
    'contract_start_date' => '2026-01-01',
    'work_locations_count' => 1
]);
$req->setContainer(app());
// We can inject it using app()->call()
try {
    $res = app()->call([app(\App\Http\Controllers\ClientController::class), 'store'], ['request' => $req]);
    echo "Success! Response: " . get_class($res) . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
