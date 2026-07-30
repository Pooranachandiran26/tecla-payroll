<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$empData = [
    'esi_applicable' => true,
    'basic_pay' => 20000,
    'hra' => 10000,
    'conveyance' => 5000, // Gross = 35000 > 21000
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 0,
    'other_additions' => 0
];

$calc = $app->make(App\Services\SalaryCalculationService::class);
echo "Result for gross > 21000:\n";
print_r($calc->calculateStructuralSalary($empData));
