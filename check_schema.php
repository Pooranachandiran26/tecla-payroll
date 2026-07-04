<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$tables = ['bank_change_requests','employee_documents','client_documents','salary_revisions','employee_exits'];
foreach($tables as $t) {
    $cols = array_column(DB::select("SHOW COLUMNS FROM $t"), 'Field');
    echo "$t: " . json_encode($cols) . "\n";
}
