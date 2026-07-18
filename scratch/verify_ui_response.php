<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use Carbon\Carbon;

// 1. Act as the admin user (id = 2 is admin@tecla.in)
$admin = User::where('email', 'admin@tecla.in')->first();
if (!$admin) {
    echo "Admin user not found!\n";
    exit(1);
}

// 2. Set test time to July 16, 2026 (same date as real local time metadata)
Carbon::setTestNow(Carbon::parse('2026-07-16'));

echo "=== VERIFYING TIMING WARNINGS AND CYCLE DATES FOR CLIENT 8 (Testing) ===\n";
echo "Client 8 Convention: " . Client::find(8)->payroll_convention . "\n";
echo "Client 8 Custom Cycle End Day: " . Client::find(8)->custom_cycle_end_day . "\n";
echo "Current Test Now: " . Carbon::now()->toDateString() . "\n\n";

$controller = app(\App\Http\Controllers\PayrollController::class);

// --- PROCESSING PAGE ---
echo "--- Fetching Processing Page Payload ---\n";
$request1 = Illuminate\Http\Request::create('/payroll/processing', 'GET', [
    'client_id' => 8,
    'payroll_month' => '2026-07-01'
]);
$request1->setUserResolver(fn() => $admin);
$app->instance('request', $request1);

$response1 = $controller->indexProcessing($request1);
$props1 = $response1->toResponse($request1)->getOriginalContent()->getData()['page']['props'] ?? [];

echo "Preflight Warnings:\n";
print_r($props1['preflight'] ?? []);
echo "\nCycle Info Reminders:\n";
print_r($props1['cycleInfo'] ?? []);
echo "\n";


// --- APPROVAL PAGE ---
echo "--- Fetching Approval Page Payload ---\n";
$request2 = Illuminate\Http\Request::create('/payroll/approval', 'GET', [
    'client_id' => 8,
    'payroll_month' => '2026-07-01'
]);
$request2->setUserResolver(fn() => $admin);
$app->instance('request', $request2);

$response2 = $controller->indexApproval($request2);
$props2 = $response2->toResponse($request2)->getOriginalContent()->getData()['page']['props'] ?? [];

echo "Preflight Warnings:\n";
print_r($props2['preflight'] ?? []);
echo "\nCycle Info Reminders:\n";
print_r($props2['cycleInfo'] ?? []);
echo "\n";

Carbon::setTestNow(); // Reset Carbon
