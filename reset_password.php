<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::firstOrCreate(
    ['email' => 'admin@tecla.in'],
    [
        'name' => 'Admin User',
        'password' => Hash::make('2f555b56a395a05403fea76c1f2c0a91'),
        'role' => 'admin',
    ]
);

// If it already existed, just force update the password to be safe
$user->password = Hash::make('2f555b56a395a05403fea76c1f2c0a91');
$user->role = 'admin'; // Ensure it is an admin
$user->save();

echo "User admin@tecla.in has been created/updated successfully with the requested password!\n";
