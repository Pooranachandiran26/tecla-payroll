<?php

require 'D:/xampp/htdocs/tecla-payroll/vendor/autoload.php';
$app = require_once 'D:/xampp/htdocs/tecla-payroll/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Http\Controllers\PayrollController;
use Illuminate\Http\Request;

echo "=== CLIENTS IN DATABASE ===\n";
$clients = Client::get(['id', 'company_name', 'status']);
foreach ($clients as $c) {
    echo "ID: {$c->id} | Name: {$c->company_name} | Status: {$c->status}\n";
}
echo "\n";

echo "=== EMPLOYEES IN DATABASE (FIRST 5) ===\n";
$employees = Employee::take(5)->get(['id', 'full_name', 'employee_code', 'client_id', 'status']);
foreach ($employees as $e) {
    echo "ID: {$e->id} | Name: {$e->full_name} | Code: {$e->employee_code} | Client ID: {$e->client_id} | Status: {$e->status}\n";
}
echo "\n";

echo "=== ATTENDANCE RECORDS FOR TODAY (2026-07-14) ===\n";
$records = AttendanceRecord::where('attendance_date', '2026-07-14')->get();
if ($records->isEmpty()) {
    echo "No attendance records found for today.\n";
} else {
    foreach ($records as $r) {
        echo "ID: {$r->id} | Employee ID: {$r->employee_id} | Date: {$r->attendance_date} | Punch In: {$r->punch_in_time} | Punch Out: {$r->punch_out_time} | Source: {$r->source}\n";
    }
}
echo "\n";

echo "=== CALLING PayrollController@indexLiveMonitor DIRECTLY ===\n";
$controller = new PayrollController();
$request = Request::create('/payroll/live-monitor', 'GET', [
    'client_id' => '1',
    'date' => '2026-07-14'
]);

$response = $controller->indexLiveMonitor($request);

echo "Response class: " . get_class($response) . "\n";
if (method_exists($response, 'toArray')) {
    $arrayData = $response->toArray();
    $props = $arrayData['props'] ?? [];
    echo "Inertia component: " . ($arrayData['component'] ?? '') . "\n";
    echo "Passed punches count: " . count($props['punches'] ?? []) . "\n";
    echo "Passed punches data:\n";
    print_r($props['punches'] ?? []);
} elseif ($response instanceof \Illuminate\Http\JsonResponse) {
    echo "JSON Response: \n";
    print_r($response->getData(true));
} else {
    echo "Response is not an Inertia response. Raw structure:\n";
    print_r($response);
}
