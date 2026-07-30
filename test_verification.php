<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Boot app
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$admin = User::firstOrCreate(['email' => 'admin@example.com'], [
    'name' => 'Admin User',
    'password' => bcrypt('password'),
    'role' => 'admin'
]);

function makeRequest($method, $uri, $payload = []) {
    global $app, $admin;
    $request = Request::create($uri, $method, $payload);
    $request->headers->set('Accept', 'application/json');
    $app->make('auth')->login($admin);
    
    // Process request
    try {
        $response = $app->handle($request);
        return [
            'status' => $response->getStatusCode(),
            'content' => $response->getContent()
        ];
    } catch (\Throwable $e) {
        return [
            'status' => 500,
            'content' => json_encode([
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], JSON_PRETTY_PRINT)
        ];
    }
}

echo "=== 2. Create Real Client with 1 Branch (TN, GSTIN starting 33) ===\n";
$payload = [
    'company_name' => 'Raw Verification Corp',
    'company_type' => 'private_limited',
    'client_code' => 'RAW-001',
    'registered_address_line_1' => '123 Main St',
    'registered_city' => 'Chennai',
    'registered_state' => 'Tamil Nadu',
    'registered_pin_code' => '600001',
    'gstin' => '33ABCDE1234F1Z5',
    'pan' => 'ABCDE1234F',
    'contract_type' => 'agency',
    'billing_model' => 'fixed',
    'contract_start_date' => '2026-07-01',
    'branches' => [
        [
            'branch_name' => 'Chennai HO',
            'state' => 'Tamil Nadu',
            'address_line_1' => '123 Main St',
            'city' => 'Chennai',
            'branch_code' => 'TN-01',
            'pin_code' => '600001',
            'gstin' => '33ABCDE1234F1Z5',
            'is_primary_billing_branch' => true
        ]
    ],
    'contacts' => [
        [
            'contact_type' => 'primary',
            'contact_name' => 'John Doe',
            'email' => 'john@raw.com',
            'phone' => '9999999999'
        ]
    ]
];
$res = makeRequest('POST', '/clients', $payload);
$clientId = json_decode($res['content'], true)['client_id'] ?? null;
if (!$clientId && $res['status'] === 302) {
    // It redirected successfully, let's find the client.
    $client = Client::where('client_code', 'RAW-001')->first();
    $clientId = $client->id;
}
echo "POST /clients returned status: " . $res['status'] . "\n";
echo "Fetching DB row for client_branches:\n";
$branchRow = DB::table('client_branches')->where('client_id', $clientId)->first();
echo json_encode($branchRow, JSON_PRETTY_PRINT) . "\n\n";

echo "=== 3. Edit Same Client WITHOUT changing anything ===\n";
$res2 = makeRequest('PUT', "/clients/{$clientId}", $payload);
echo "PUT /clients/{$clientId} returned status: " . $res2['status'] . "\n";
echo "Fetching DB row again:\n";
$branchRow2 = DB::table('client_branches')->where('client_id', $clientId)->first();
echo json_encode($branchRow2, JSON_PRETTY_PRINT) . "\n\n";

echo "=== 4. Mismatched GSTIN (TN + starting 27) ===\n";
$payloadBadGst = $payload;
$payloadBadGst['client_code'] = 'RAW-002'; // prevent unique validation fail
$payloadBadGst['branches'][0]['gstin'] = '27ABCDE1234F1Z5'; // 27 is MH
$resBadGst = makeRequest('POST', '/clients', $payloadBadGst);
echo "Status: " . $resBadGst['status'] . "\n";
echo "Response:\n" . json_encode(json_decode($resBadGst['content']), JSON_PRETTY_PRINT) . "\n\n";

echo "=== 5. Submit two primary billing branches ===\n";
$payloadTwoPrimary = $payload;
$payloadTwoPrimary['client_code'] = 'RAW-003';
$payloadTwoPrimary['branches'][] = [
    'branch_name' => 'Mumbai BO',
    'state' => 'Maharashtra',
    'address_line_1' => '456 Side St',
    'city' => 'Mumbai',
    'branch_code' => 'MH-01',
    'pin_code' => '400001',
    'gstin' => '27ABCDE1234F1Z5',
    'is_primary_billing_branch' => true
];
$resTwoPrimary = makeRequest('POST', '/clients', $payloadTwoPrimary);
echo "Status: " . $resTwoPrimary['status'] . "\n";
echo "Response:\n" . json_encode(json_decode($resTwoPrimary['content']), JSON_PRETTY_PRINT) . "\n\n";

echo "=== 6. Submit with no primary contact ===\n";
$payloadNoContact = $payload;
$payloadNoContact['client_code'] = 'RAW-004';
$payloadNoContact['contacts'] = [];
$resNoContact = makeRequest('POST', '/clients', $payloadNoContact);
echo "Status: " . $resNoContact['status'] . "\n";
echo "Response:\n" . json_encode(json_decode($resNoContact['content']), JSON_PRETTY_PRINT) . "\n\n";
