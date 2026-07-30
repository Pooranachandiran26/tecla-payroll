<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$empA = App\Models\Employee::where('employee_code', 'EMP-A001')->first();
$service = app(App\Services\SalaryCalculationService::class);

$proRatedComponents = [
    'basic_pay' => 29000.00,
    'hra' => 5370.37,
    'conveyance' => 2148.15,
];

$employeeData = array_merge($proRatedComponents, [
    'pf_applicable' => (bool)$empA->pf_applicable,
    'esi_applicable' => false,
    'esi_limit' => 21000.00,
    'pt_applicable' => false,
    'pt_deduction_override' => 0.00,
]);

echo "empA pf_applicable raw: " . var_export($empA->pf_applicable, true) . "\n";
echo "employeeData: " . json_encode($employeeData) . "\n";

$res = $service->calculateStructuralSalary($employeeData);
echo "Result: " . json_encode($res) . "\n";
