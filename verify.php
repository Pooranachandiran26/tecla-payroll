<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$columns = Illuminate\Support\Facades\DB::select('DESCRIBE employees');
echo "\nDESCRIBE employees:\n";
foreach($columns as $c) {
    echo str_pad($c->Field, 30) . " | " . str_pad($c->Type, 20) . " | " . ($c->Null) . " | " . ($c->Key) . "\n";
}
$indexes = Illuminate\Support\Facades\DB::select('SHOW INDEX FROM employees');
echo "\nSHOW INDEX FROM employees:\n";
foreach($indexes as $i) {
    echo str_pad($i->Key_name, 30) . " | " . str_pad($i->Column_name, 30) . " | Non_unique: " . $i->Non_unique . "\n";
}
$emp = App\Models\Employee::where('employee_code', 'TEC-088')->first();
if ($emp) {
    echo "\nTHE CANONICAL PF CHECK:\n" . $emp->employer_pf_monthly . "\n";
} else {
    echo "\nTEC-088 not found\n";
}

echo "\nDESCRIBE salary_revisions:\n";
try {
    $rev = Illuminate\Support\Facades\DB::select('DESCRIBE salary_revisions');
    foreach($rev as $c) {
        echo str_pad($c->Field, 30) . " | " . str_pad($c->Type, 20) . "\n";
    }
} catch (\Exception $e) {
    echo "salary_revisions does not exist\n";
}
