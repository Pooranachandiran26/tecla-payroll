<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ComplianceFiling;
use App\Models\User;
use Carbon\Carbon;

$period = '2026-08-01'; // Current compliance month
$adminUser = User::first();
$adminId = $adminUser ? $adminUser->id : null;

$clients = Client::all();
echo "Found " . count($clients) . " clients.\n";

// Map some clients with realistic filed statuses for testing
$sampleStatuses = [
    // Client ID => [statute => status]
    1 => ['pf' => 'filed', 'esi' => 'filed', 'pt' => 'filed', 'tds' => 'filed', 'clra' => 'pending'],
    2 => ['pf' => 'filed', 'esi' => 'filed', 'pt' => 'pending', 'tds' => 'filed', 'clra' => 'pending'],
    3 => ['pf' => 'filed', 'esi' => 'filed', 'pt' => 'filed', 'tds' => 'filed', 'clra' => 'filed'],
    4 => ['pf' => 'pending', 'esi' => 'filed', 'pt' => 'filed', 'tds' => 'pending', 'clra' => 'pending'],
    5 => ['pf' => 'filed', 'esi' => 'pending', 'pt' => 'filed', 'tds' => 'filed', 'clra' => 'filed'],
];

foreach ($clients as $index => $client) {
    $clientMap = $sampleStatuses[$client->id] ?? [
        'pf' => ($index % 2 === 0) ? 'filed' : 'pending',
        'esi' => ($index % 3 === 0) ? 'filed' : 'pending',
        'pt' => ($index % 2 === 1) ? 'filed' : 'pending',
        'tds' => ($index % 4 === 0) ? 'filed' : 'pending',
        'clra' => 'pending',
    ];

    foreach (['pf', 'esi', 'pt', 'tds', 'clra'] as $statute) {
        $status = $clientMap[$statute] ?? 'pending';
        ComplianceFiling::updateOrCreate(
            [
                'client_id' => $client->id,
                'statute' => $statute,
                'period' => $period,
            ],
            [
                'status' => $status,
                'filed_by' => $status === 'filed' ? $adminId : null,
                'filed_at' => $status === 'filed' ? Carbon::now()->subDays(rand(1, 5)) : null,
                'notes' => $status === 'filed' ? "Filed automatically via statutory compliance center." : null,
            ]
        );
    }
    echo "Updated compliance filings for {$client->company_name}\n";
}

echo "COMPLIANCE SEED COMPLETED SUCCESSFULLY!\n";
