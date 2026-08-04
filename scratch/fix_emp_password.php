<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$employees = User::where('role', 'employee')->get();

foreach ($employees as $emp) {
    $emp->password = Hash::make('Password@123');
    $emp->save();
}

echo "Updated " . count($employees) . " employee accounts to Password@123";
