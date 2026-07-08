<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emp = App\Models\Employee::where('employee_code', 'TEC-088')->first();
if ($emp) {
    echo "TEC-088 exists. PF is: " . $emp->employer_pf_monthly . "\n";
} else {
    echo "TEC-088 does NOT exist.\n";
}
