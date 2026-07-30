<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$employee = \App\Models\Employee::first();
$employee->update(['basic_pay'=>30000, 'lop_basis_days'=>'30', 'date_of_joining'=>now()->subYears(5)->toDateString()]);
$inputs = ['last_working_day'=>now()->addDays(15)->toDateString(), 'notice_shortfall_days'=>15, 'notice_amount_type'=>'deduction', 'unused_leaves'=>10];
$calc = new \App\Services\FullAndFinalCalculationService();
$result = $calc->calculatePreview($employee, $inputs);
echo json_encode($result, JSON_PRETTY_PRINT);
