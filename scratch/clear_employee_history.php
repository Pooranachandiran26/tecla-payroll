<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BulkUploadBatch;
use Illuminate\Support\Facades\DB;

DB::beginTransaction();
try {
    // Find all employee bulk upload batch IDs
    $empBatchIds = BulkUploadBatch::where(function ($q) {
        $q->where('type', 'employee_onboarding')
          ->orWhereNull('type')
          ->orWhere('type', '!=', 'attendance');
    })->pluck('id')->toArray();

    if (!empty($empBatchIds)) {
        // Delete related staging rows
        DB::table('bulk_upload_staging_rows')->whereIn('batch_id', $empBatchIds)->delete();
        
        // Delete history batches
        BulkUploadBatch::whereIn('id', $empBatchIds)->delete();
    }

    DB::commit();

    $remainingEmpBatches = BulkUploadBatch::where(function ($q) {
        $q->where('type', 'employee_onboarding')
          ->orWhereNull('type')
          ->orWhere('type', '!=', 'attendance');
    })->count();

    echo "SUCCESS: Cleared " . count($empBatchIds) . " employee bulk upload history batches. Remaining employee batches: {$remainingEmpBatches}.";
} catch (\Throwable $e) {
    DB::rollBack();
    echo "ERROR: " . $e->getMessage();
}
