<?php

namespace App\Jobs;

use App\Models\BulkUploadBatch;
use App\Services\FastBulkUploadService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessBulkUploadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1200; // 20 minutes for massive datasets
    public int $tries = 1;

    protected string $batchId;

    public function __construct(string $batchId)
    {
        $this->batchId = $batchId;
    }

    public function handle(FastBulkUploadService $fastBulkService): void
    {
        $batch = BulkUploadBatch::find($this->batchId);
        if (!$batch) {
            Log::error("ProcessBulkUploadJob: Batch {$this->batchId} not found.");
            return;
        }

        $batch->update(['status' => 'processing']);

        try {
            $progressCallback = function ($processed, $valid, $errors, $warnings) use ($batch) {
                $batch->update([
                    'processed_rows' => $processed,
                    'total_rows' => max($batch->total_rows, $processed),
                    'valid_count' => $valid,
                    'error_count' => $errors,
                    'warning_count' => $warnings,
                ]);
            };

            $results = $fastBulkService->processUpload($batch->file_path, $batch->id, $progressCallback);

            $batch->update([
                'total_rows' => $results['total_rows'],
                'processed_rows' => $results['total_rows'],
                'valid_count' => $results['valid_count'],
                'error_count' => $results['error_count'],
                'warning_count' => $results['warning_count'],
            ]);

            if ($results['error_count'] > 0 && !$batch->partial_import) {
                $batch->update([
                    'status' => 'failed',
                    'error_message' => 'File contains validation errors.',
                    'summary' => $results,
                ]);
                @unlink($batch->file_path);
                return;
            }

            if ($results['valid_count'] === 0) {
                $batch->update([
                    'status' => 'failed',
                    'error_message' => 'No valid rows found to import.',
                    'summary' => $results,
                ]);
                @unlink($batch->file_path);
                return;
            }

            $importRes = $fastBulkService->executeBatchImport($batch->id, $batch->user_id);

            $batch->update([
                'status' => 'completed',
                'summary' => [
                    'imported_count' => $importRes['imported_count'],
                    'client_impacts' => $importRes['client_impacts'],
                    'ignored_errors_count' => $results['error_count'],
                ],
            ]);

            if ($batch->auto_provision_users && !empty($importRes['employee_ids'])) {
                ProvisionBulkUploadUsersJob::dispatch($importRes['employee_ids'], $batch->user_id);
            }

            @unlink($batch->file_path);
        } catch (\Throwable $e) {
            Log::error("ProcessBulkUploadJob failed for batch {$this->batchId}: " . $e->getMessage(), [
                'exception' => $e
            ]);

            $batch->update([
                'status' => 'failed',
                'error_message' => 'Processing failed: ' . $e->getMessage(),
            ]);

            if (file_exists($batch->file_path)) {
                @unlink($batch->file_path);
            }
        }
    }
}
