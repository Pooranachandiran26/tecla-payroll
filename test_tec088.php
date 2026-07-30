<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emp = App\Models\Employee::where('employee_code', 'TEC-088')->first();
if (!$emp) {
    echo "TEC-088 not found, using first employee with gross > 21000 and ESI = true.\n";
    $emp = App\Models\Employee::where('esi_applicable', true)
        ->whereRaw('(basic_pay + hra + conveyance + da + medical_allowance + special_allowance + other_additions) > 21000')
        ->first();
}

if ($emp) {
    echo "Testing employee: " . $emp->employee_code . " (ESI Applicable: " . ($emp->esi_applicable ? 'true' : 'false') . ")\n";
    $calc = $app->make(App\Services\SalaryCalculationService::class);
    print_r($calc->calculateStructuralSalary($emp->toArray()));
} else {
    echo "No matching employee found.\n";
}
