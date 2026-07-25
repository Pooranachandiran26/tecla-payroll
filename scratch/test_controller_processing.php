<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\PayrollController;
use Illuminate\Http\Request;

$controller = app(PayrollController::class);
$request = Request::create('/payroll/processing', 'GET', [
    'client_id' => 32,
    'payroll_month' => '2026-07-01'
]);

$response = $controller->indexProcessing($request);
echo "Processing Page Controller Response Status: OK!\n";
$pageProps = $response->toResponse($request)->original->getData()['page']['props'];

echo "Items loaded: " . count($pageProps['items']) . "\n";
foreach ($pageProps['items'] as $i) {
    echo "Emp: {$i->employee_code} ({$i->full_name}) | RevisionApplied: {$i->salary_revision_applied} | MidNote: " . ($i->mid_cycle_note ?? 'none') . "\n";
}
