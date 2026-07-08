<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$affected = App\Models\Employee::where('esi_applicable', true)
    ->whereRaw('(basic_pay + hra + conveyance + da + medical_allowance + special_allowance + other_additions) > 21000')
    ->where('employer_esi_monthly', '>', 0)
    ->get();

echo "Affected Employees Count: " . $affected->count() . "\n";
foreach($affected as $emp) {
    echo "Fixing {$emp->employee_code}... Gross: " . ($emp->basic_pay + $emp->hra + $emp->conveyance + $emp->da + $emp->medical_allowance + $emp->special_allowance + $emp->other_additions) . "\n";
    // Trigger observer
    $emp->save();
}

if ($affected->count() > 0) {
    echo "All affected employees have been re-saved and fixed.\n";
}
