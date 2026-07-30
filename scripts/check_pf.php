<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$empA = App\Models\Employee::where('employee_code', 'EMP-A001')->first();
$empB = App\Models\Employee::where('employee_code', 'EMP-B002')->first();
$client = App\Models\Client::where('client_code', 'VERIF001')->first();

echo "Emp A pf_applicable: " . json_encode($empA->pf_applicable) . "\n";
echo "Emp B pf_applicable: " . json_encode($empB->pf_applicable) . "\n";
echo "Client pf_applicable: " . json_encode($client->pf_applicable) . "\n";

$itemA = App\Models\PayrollRunItem::where('employee_id', $empA->id)->latest()->first();
$itemB = App\Models\PayrollRunItem::where('employee_id', $empB->id)->latest()->first();

echo "Item A Columns: " . json_encode($itemA->only(['basic_pay', 'hra', 'conveyance', 'gross_total', 'employee_pf', 'employee_esi', 'professional_tax', 'lop_deduction', 'net_pay', 'employer_pf'])) . "\n";
echo "Item B Columns: " . json_encode($itemB->only(['basic_pay', 'hra', 'conveyance', 'gross_total', 'employee_pf', 'employee_esi', 'professional_tax', 'lop_deduction', 'net_pay', 'employer_pf'])) . "\n";
