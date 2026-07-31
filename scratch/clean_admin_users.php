<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== CLEANING ADMIN USERS ===\n\n";

DB::statement('SET FOREIGN_KEY_CHECKS=0;');

$deletedCount = DB::table('users')
    ->where('role', 'admin')
    ->where('email', '!=', 'chandru.2316728@gmail.com')
    ->delete();

DB::statement('SET FOREIGN_KEY_CHECKS=1;');

echo "✓ Deleted {$deletedCount} non-target admin user(s).\n\n";

echo "=== REMAINING ADMIN USERS ===\n";
$admins = DB::table('users')->where('role', 'admin')->get();
foreach ($admins as $a) {
    echo "ID: {$a->id} | Name: {$a->name} | Email: {$a->email} | Role: {$a->role}\n";
}

echo "\n=== CONFIRMING CLIENTS TABLE IS UNTOUCHED ===\n";
$clients = DB::table('clients')->select('id', 'company_name', 'client_code')->get();
foreach ($clients as $c) {
    echo "ID: {$c->id} | Name: {$c->company_name} | Code: {$c->client_code}\n";
}
