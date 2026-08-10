<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$runs = App\Models\PayrollRun::with('client')->get();

echo "TOTAL PAYROLL RUNS: " . count($runs) . "\n\n";
foreach ($runs as $r) {
    echo "Run #{$r->id} | Client: " . ($r->client->company_name ?? 'N/A') . " | Month: {$r->payroll_month} | Status: {$r->status}\n";
}
