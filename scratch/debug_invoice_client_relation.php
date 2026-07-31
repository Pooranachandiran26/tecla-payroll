<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Invoice;

$invoices = Invoice::with(['client', 'branch'])->get();
foreach ($invoices as $inv) {
    echo "Invoice ID: {$inv->id} | Number: {$inv->invoice_number}\n";
    echo "Client ID: {$inv->client_id}\n";
    echo "Client Object: " . ($inv->client ? $inv->client->company_name : 'NULL') . "\n";
}
