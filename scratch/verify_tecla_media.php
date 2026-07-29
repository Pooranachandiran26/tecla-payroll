<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = app(\App\Services\BulkUploadValidationService::class);
$filePath = storage_path('app/public/Tecla_Media_20_Employees_Bulk_Upload.xlsx');
$results = $service->validateFile($filePath);

echo "--- TECLA MEDIA (TEC-278) BULK UPLOAD VALIDATION --- \n";
echo "Total Rows Parsed: " . $results['total_rows'] . "\n";
echo "Valid Count: " . $results['valid_count'] . "\n";
echo "Error Count: " . $results['error_count'] . "\n";
echo "Warning Count: " . $results['warning_count'] . "\n\n";

foreach ($results['rows'] as $r) {
    echo "Row {$r['rowNo']}: Code={$r['empCode']} | Name={$r['empName']} | Status={$r['status']} | CTC=₹{$r['ctc']} | Message={$r['message']}\n";
}
