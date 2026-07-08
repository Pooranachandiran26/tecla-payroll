<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Count: " . \App\Models\Employee::count() . "\n";
$emp = \App\Models\Employee::where('employee_code','TEC-088')->first();
echo "TEC-088 PF: " . ($emp ? $emp->employer_pf_monthly : 'Not Found') . "\n";
