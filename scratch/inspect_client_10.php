<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;

$client10 = Client::find(10);
echo "Client #10 ({$client10->company_name}):\n";
echo "- payslip_template: " . var_export($client10->payslip_template, true) . "\n";
echo "- accent_color: " . var_export($client10->accent_color, true) . "\n";
