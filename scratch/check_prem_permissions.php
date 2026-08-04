<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::where('email', 'premsathiyaseelan5@gmail.com')->orWhere('name', 'prem')->first();

if ($user) {
    echo "User ID: " . $user->id . "\n";
    echo "Name: " . $user->name . "\n";
    echo "Role: " . $user->role . "\n";
    echo "Module Permissions in DB:\n";
    var_dump($user->module_permissions);
} else {
    echo "User prem not found.\n";
}
