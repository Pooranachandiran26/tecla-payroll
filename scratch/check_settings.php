<?php

require 'D:/xampp/htdocs/tecla-payroll/vendor/autoload.php';
$app = require_once 'D:/xampp/htdocs/tecla-payroll/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Setting;

$settings = Setting::where('group', 'auth_security')->get();
foreach ($settings as $s) {
    echo "Key: {$s->key} | Value: {$s->value}\n";
}
