<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

$userId = 64; // mavicjesh481@gmail.com
$otp = '123456';

DB::table('otp_codes')->where('user_id', $userId)->update([
    'code_hash' => Hash::make($otp),
    'expires_at' => now()->addMinutes(10),
    'consumed_at' => null,
    'attempts' => 0
]);

echo "OTP for user 64 reset to 123456\n";
