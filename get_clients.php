<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach(App\Models\Client::with('branches')->get() as $c) {
    echo $c->client_code . ':' . $c->branches->count() . "\n";
}
