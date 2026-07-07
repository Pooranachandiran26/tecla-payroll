<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $columns = \Illuminate\Support\Facades\DB::select('DESCRIBE salary_revisions');
    foreach ($columns as $c) {
        echo $c->Field . ' - ' . $c->Type . "\n";
    }
} catch (\Exception $e) {
    echo "Table does not exist or error: " . $e->getMessage() . "\n";
}
