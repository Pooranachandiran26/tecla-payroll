<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== DESCRIBE employees ===\n";
foreach (\Illuminate\Support\Facades\DB::select('DESCRIBE employees') as $c) {
    if (in_array($c->Field, ['lop_basis_days', 'tds_applicable', 'pan_number_hash', 'aadhaar_number_hash', 'bank_account_hash'])) {
        echo "* " . $c->Field . " - " . $c->Type . "\n";
    }
}

echo "\n=== SHOW INDEX FROM employees ===\n";
$indexes = \Illuminate\Support\Facades\DB::select('SHOW INDEX FROM employees');
foreach ($indexes as $idx) {
    if ($idx->Non_unique == 0) {
        echo "[UNIQUE] " . $idx->Key_name . " -> " . $idx->Column_name . "\n";
    } else {
        echo "[NON-UNIQUE] " . $idx->Key_name . " -> " . $idx->Column_name . "\n";
    }
}

echo "\n=== CANONICAL PF CHECK ===\n";
echo "employer_pf_monthly for TEC-088: " . \App\Models\Employee::where('employee_code','TEC-088')->first()->employer_pf_monthly . "\n";
