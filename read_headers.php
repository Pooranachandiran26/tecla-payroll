<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$reader = Spatie\SimpleExcel\SimpleExcelReader::create(public_path('templates/employee_bulk_upload_template.xlsx'))->fromSheetName('Employee Data');
$headers = $reader->getHeaders();
echo implode(',', $headers) . "\n";
