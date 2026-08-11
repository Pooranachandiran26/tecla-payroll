<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\SettingsService;
use Illuminate\Support\Facades\Cache;

echo "--- Disabling OTP via SettingsService ---\n";
SettingsService::set('auth_security.otp_enabled', false);
Cache::flush();
echo "OTP setting successfully set to false via SettingsService.\n";
