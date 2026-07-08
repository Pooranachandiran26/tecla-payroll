<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== CLIENTS ===\n";
foreach (\Illuminate\Support\Facades\DB::select('DESCRIBE clients') as $c) {
    echo $c->Field . " - " . $c->Type . "\n";
}
echo "\n=== EMPLOYEES ===\n";
foreach (\Illuminate\Support\Facades\DB::select('DESCRIBE employees') as $c) {
    echo $c->Field . " - " . $c->Type . "\n";
}
