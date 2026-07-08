<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = new \Illuminate\Http\Request();
$request->merge([
    'pf_applicable' => true,
    'esi_applicable' => true,
    'basic_pay' => 50000,
    'hra' => 20000,
    'conveyance' => 5000,
    'da' => 0,
    'medical_allowance' => 5000,
    'special_allowance' => 0,
    'other_additions' => 0,
    'pt_deduction_override' => null
]);

$controller = $app->make(\App\Http\Controllers\EmployeeController::class);
$service = $app->make(\App\Services\SalaryCalculationService::class);
$response = $controller->calculatePreview($request, $service);

echo "Single Employee Form Preview Result:\n";
print_r($response->getData(true));
