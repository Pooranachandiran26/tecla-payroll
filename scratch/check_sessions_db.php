<?php

require 'D:/xampp/htdocs/tecla-payroll/vendor/autoload.php';
$app = require_once 'D:/xampp/htdocs/tecla-payroll/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$sessions = DB::table('sessions')->get();
echo "Total sessions in DB: " . $sessions->count() . "\n";
foreach ($sessions as $s) {
    echo "ID: {$s->id} | User ID: {$s->user_id} | IP: {$s->ip_address} | Last Activity: " . date('Y-m-d H:i:s', $s->last_activity) . "\n";
}
