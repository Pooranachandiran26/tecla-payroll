<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$indexes = \Illuminate\Support\Facades\DB::select('SHOW INDEX FROM employees');
foreach ($indexes as $idx) {
    if ($idx->Non_unique == 0) {
        echo $idx->Key_name . ' -> ' . $idx->Column_name . "\n";
    }
}
