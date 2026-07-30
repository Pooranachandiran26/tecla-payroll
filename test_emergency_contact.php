<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emp = App\Models\Employee::first();
if ($emp) {
    $emp->emergency_contact_phone = '9998887776';
    $emp->save();
    echo "Employee ID: " . $emp->id . "\n";
    echo "emergency_contact_phone DB: " . $emp->emergency_contact_phone . "\n";

    $resource = new App\Http\Resources\EmployeeResource($emp);
    $arr = $resource->toArray(request());
    echo "Resource array emergency_contact_phone: " . ($arr['emergency_contact_phone'] ?? 'NOT FOUND') . "\n";
} else {
    echo "No employee found.\n";
}
