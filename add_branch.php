<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$c = App\Models\Client::where('client_code', 'SYN-809')->first();
if ($c) {
    $b = new App\Models\ClientBranch();
    $b->client_id = $c->id;
    $b->branch_name = 'Mumbai Hub';
    $b->branch_code = 'MUM01';
    $b->save();
    echo "Added dummy branch to SYN-809.\n";
}
