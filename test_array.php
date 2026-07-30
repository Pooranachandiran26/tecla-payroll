<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emp = App\Models\Employee::first();

// simulate what Inertia receives
echo "Employee object keys from toArray():\n";
print_r(array_keys($emp->toArray()));

echo "emergency_contact_phone: " . $emp->toArray()['emergency_contact_phone'] ?? 'missing';
