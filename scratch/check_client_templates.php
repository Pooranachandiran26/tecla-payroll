<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$legacyRows = DB::table('clients')
    ->whereIn('payslip_template', ['standard_blue', 'modern_navy', 'corporate_slate'])
    ->get();

echo "Legacy rows count in DB: " . count($legacyRows) . "\n\n";

$allClientTemplates = DB::table('clients')
    ->select('id', 'company_name', 'payslip_template')
    ->get();

echo "Active Client Templates in DB:\n";
foreach ($allClientTemplates as $c) {
    echo "- Client #{$c->id}: {$c->company_name} => {$c->payslip_template}\n";
}
