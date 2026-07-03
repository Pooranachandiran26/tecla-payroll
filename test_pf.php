<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$calc = app(App\Services\SalaryCalculationService::class);
$res = $calc->calculateStructuralSalary([
  'basic_pay' => 25000,
  'hra' => 10000,
  'conveyance' => 1600,
  'da' => 0,
  'medical_allowance' => 1250,
  'special_allowance' => 0,
  'other_additions' => 0,
  'pf_applicable' => true,
  'esi_applicable' => true,
]);
echo "Basic Pay: 25000\n";
echo "Employer PF: " . $res['employer_pf_monthly'] . "\n";
echo "Employee PF: " . $res['employee_pf_monthly'] . "\n";
