<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\App\Services\SettingsService::set('branding.primary_color', '#082d9b');
echo "Brand color set successfully to: " . \App\Services\SettingsService::get('branding.primary_color') . "\n";
