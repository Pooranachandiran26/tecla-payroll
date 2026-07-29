<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\SalaryCalculationService;

$service = app(SalaryCalculationService::class);

$cappedData = [
    'basic_pay' => 50000,
    'pf_applicable' => true,
    'pf_ceiling' => 15000,
    'eps_applicable' => true,
    'edli_exempted' => false,
];
$calcCapped = $service->calculateStructuralSalary($cappedData);

$uncappedData = [
    'basic_pay' => 50000,
    'pf_applicable' => true,
    'pf_ceiling' => 50000, // Uncapped
    'eps_applicable' => true,
    'edli_exempted' => false,
];
$calcUncapped = $service->calculateStructuralSalary($uncappedData);

echo "=== SCENARIO A: CAPPED PF (Wages Capped @ ₹15,000) ===\n";
echo "1. Employee PF: ₹" . number_format($calcCapped['employee_pf_monthly'], 2) . "\n";
echo "2. Employer EPF: ₹" . number_format($calcCapped['employer_epf_monthly'], 2) . "\n";
echo "3. Employer EPS: ₹" . number_format($calcCapped['employer_eps_monthly'], 2) . "\n";
echo "   -> Total Employer PF (EPF + EPS): ₹" . number_format($calcCapped['employer_pf_monthly'], 2) . "\n";
echo "4. EDLI Charges: ₹" . number_format($calcCapped['edli_monthly'], 2) . "\n";
echo "5. EPF Admin Charges: ₹" . number_format($calcCapped['epf_admin_monthly'], 2) . "\n\n";

echo "=== SCENARIO B: UNCAPPED PF / PARA 26(6) (Wages @ Full ₹50,000 Basic) ===\n";
echo "1. Employee PF: ₹" . number_format($calcUncapped['employee_pf_monthly'], 2) . "\n";
echo "2. Employer EPF: ₹" . number_format($calcUncapped['employer_epf_monthly'], 2) . "\n";
echo "3. Employer EPS: ₹" . number_format($calcUncapped['employer_eps_monthly'], 2) . "\n";
echo "   -> Total Employer PF (EPF + EPS): ₹" . number_format($calcUncapped['employer_pf_monthly'], 2) . "\n";
echo "4. EDLI Charges: ₹" . number_format($calcUncapped['edli_monthly'], 2) . "\n";
echo "5. EPF Admin Charges: ₹" . number_format($calcUncapped['epf_admin_monthly'], 2) . "\n";
