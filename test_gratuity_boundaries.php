<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$employee = \App\Models\Employee::first();
$employee->update(['basic_pay'=>30000, 'lop_basis_days'=>'30']);

$calc = new \App\Services\FullAndFinalCalculationService();

echo "Case 1: 5 years, 7 months (approx 5.58 years)\n";
$employee->update(['date_of_joining' => now()->subYears(5)->subMonths(7)->toDateString()]);
$inputs1 = ['last_working_day' => now()->toDateString()];
$result1 = $calc->calculatePreview($employee, $inputs1);
echo "Computed Gratuity: " . $result1['gratuity_amount'] . "\n\n";

echo "Case 2: 5 years, 5 months (approx 5.42 years)\n";
$employee->update(['date_of_joining' => now()->subYears(5)->subMonths(5)->toDateString()]);
$inputs2 = ['last_working_day' => now()->toDateString()];
$result2 = $calc->calculatePreview($employee, $inputs2);
echo "Computed Gratuity: " . $result2['gratuity_amount'] . "\n";
