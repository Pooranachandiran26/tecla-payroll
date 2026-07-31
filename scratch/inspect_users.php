<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== CURRENT USERS IN DB ===\n";
$users = DB::table('users')->select('id', 'name', 'email', 'role')->get();
foreach ($users as $u) {
    echo "ID: {$u->id} | Name: {$u->name} | Email: {$u->email} | Role: {$u->role}\n";
}

echo "\n=== CLIENTS IN DB (DO NOT TOUCH) ===\n";
$clients = DB::table('clients')->select('id', 'company_name', 'client_code')->get();
foreach ($clients as $c) {
    echo "ID: {$c->id} | Name: {$c->company_name} | Code: {$c->client_code}\n";
}
