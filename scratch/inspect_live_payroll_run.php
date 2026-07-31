<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== 1. CLIENT DATA ===\n";
$client = DB::table('clients')->first();
print_r($client);

echo "\n=== 2. EMPLOYEE DATA ===\n";
$employee = DB::table('employees')->first();
print_r($employee);

echo "\n=== 3. PAYROLL RUN ===\n";
$run = DB::table('payroll_runs')->first();
print_r($run);

echo "\n=== 4. PAYROLL RUN ITEM ===\n";
$item = DB::table('payroll_run_items')->first();
print_r($item);
