<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$count = DB::table('payroll_run_items')->count();
echo "EXACT_PAYROLL_RUN_ITEMS_COUNT: " . $count . "\n";
