<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;

$clients = Client::all(['id', 'company_name', 'client_code', 'invoice_cycle']);

echo "=== CLIENT INVOICE CYCLES IN DB ===\n";
echo "Total Clients: " . $clients->count() . "\n\n";

$counts = [];
foreach ($clients as $c) {
    $cycle = $c->invoice_cycle ?: 'null (monthly default)';
    $counts[$cycle] = ($counts[$cycle] ?? 0) + 1;
    echo "ID: {$c->id} | Code: {$c->client_code} | Name: {$c->company_name} | Cycle: {$cycle}\n";
}

echo "\n--- SUMMARY BY CYCLE ---\n";
foreach ($counts as $cycle => $count) {
    echo "Cycle '{$cycle}': {$count} client(s)\n";
}
