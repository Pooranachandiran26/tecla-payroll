<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== DB TRUNCATION VERIFICATION ===\n";
echo "Clients count: " . DB::table('clients')->count() . "\n";
echo "Employees count: " . DB::table('employees')->count() . "\n";
echo "Payroll Runs count: " . DB::table('payroll_runs')->count() . "\n";
echo "Invoices count: " . DB::table('invoices')->count() . "\n";
echo "Users count (Preserved): " . DB::table('users')->count() . "\n";
