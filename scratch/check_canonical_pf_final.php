<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Services\SalaryCalculationService;

$client = Client::first();
if (!$client) {
    echo "No client found in DB, using mock test\n";
}

$service = new SalaryCalculationService();
$res = $service->calculateStructuralSalary([
    'client_id' => $client ? $client->id : 1,
    'basic_pay' => 25000,
    'hra' => 5000,
    'da' => 0,
    'special_allowance' => 0,
    'other_additions' => 0,
]);

echo "=== CANONICAL PF CHECK ===\n";
echo "Basic Pay: ₹25,000.00\n";
echo "Employee PF: ₹" . number_format($res['employee_pf_monthly'], 2) . "\n";
echo "Employer PF: ₹" . number_format($res['employer_pf_monthly'], 2) . "\n";
echo "  - Employer EPF: ₹" . number_format($res['employer_epf_monthly'], 2) . "\n";
echo "  - Employer EPS: ₹" . number_format($res['employer_eps_monthly'], 2) . "\n";

if (abs($res['employer_pf_monthly'] - 1950.00) < 0.01 && abs($res['employee_pf_monthly'] - 1800.00) < 0.01) {
    echo "CANONICAL PF BENCHMARK PASSED (Employer PF = 1950.00, Employee PF = 1800.00)\n";
} else {
    echo "CANONICAL PF BENCHMARK FAILED!\n";
}
