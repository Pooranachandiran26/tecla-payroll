<?php

namespace App\Jobs;

use App\Models\BulkUploadBatch;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Services\AttendanceUploadValidationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ProcessAttendanceBulkUploadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 1200;
    public int $tries = 1;

    protected string $batchId;

    public function __construct(string $batchId)
    {
        $this->batchId = $batchId;
    }

    public function handle(AttendanceUploadValidationService $validationService): void
    {
        $batch = BulkUploadBatch::find($this->batchId);
        if (!$batch) {
            Log::error("ProcessAttendanceBulkUploadJob: Batch {$this->batchId} not found.");
            return;
        }

        $batch->update(['status' => 'processing']);

        try {
            // Check if staging rows already exist (from the validation step)
            $hasStagingRows = DB::table('attendance_upload_staging_rows')
                ->where('batch_id', $batch->id)
                ->exists();

            if (!$hasStagingRows) {
                // Run validation to populate staging rows (fallback for older flow)
                $targetMonthStr = $batch->target_month->format('Y-m');
                $results = $validationService->validateFile($batch->file_path, $batch->client_id, $targetMonthStr, $batch->id);

                $batch->update([
                    'total_rows' => $results['total_rows'],
                    'processed_rows' => $results['total_rows'],
                    'valid_count' => $results['matched_rows'],
                    'error_count' => $results['error_count'],
                    'warning_count' => $results['skipped_count'],
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

                if ($results['matched_rows'] === 0) {
                    $batch->update([
                        'status' => 'failed',
                        'error_message' => 'No valid rows found to import.',
                        'summary' => $results,
                    ]);
                    @unlink($batch->file_path);
                    return;
                }
            }

            // Retrieve ready staging rows
            $stagingRows = DB::table('attendance_upload_staging_rows')
                ->where('batch_id', $batch->id)
                ->where('status', 'ready')
                ->get();

            if ($stagingRows->isEmpty()) {
                $batch->update([
                    'status' => 'failed',
                    'error_message' => 'No valid rows found to import.',
                ]);
                @unlink($batch->file_path);
                return;
            }

            // Preload all employees for this client in 1 query
            $clientId = $batch->client_id;
            $targetMonthStr = $batch->target_month->format('Y-m');
            $monthStart = Carbon::parse($targetMonthStr . '-01');
            $monthEnd = $monthStart->copy()->endOfMonth();

            $employees = DB::table('employees')
                ->where('client_id', $clientId)
                ->select('id', 'employee_code', 'date_of_joining', 'attendance_tracking_start_date', 'weekly_off_pattern')
                ->get()
                ->keyBy('employee_code');

            $clientModel = \App\Models\Client::find($clientId);
            $clientHolidayDates = \App\Models\Holiday::where('client_id', $clientId)
                ->whereBetween('holiday_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->pluck('holiday_date')
                ->map(fn($d) => Carbon::parse($d)->toDateString())
                ->toArray();

            // Bulk load punch dates
            $existingPunchesDatesMap = AttendanceRecord::whereIn('employee_id', $employees->pluck('id'))
                ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->whereIn('source', ['live_punch', 'override'])
                ->get(['employee_id', 'attendance_date'])
                ->groupBy('employee_id')
                ->map(fn($group) => $group->pluck('attendance_date')->map(fn($d) => Carbon::parse($d)->toDateString())->toArray())
                ->toArray();

            DB::beginTransaction();

            $importedCount = 0;
            $insertChunk = [];
            $nowStr = now()->toDateTimeString();

            foreach ($stagingRows as $row) {
                $employee = $employees->get($row->employee_code);
                if (!$employee) continue;

                $daysPresent = (int) $row->days_present;
                $daysLop = (int) $row->days_lop;

                // Calculate effective start for this employee
                $employeeStart = Carbon::parse($employee->date_of_joining)->startOfDay();
                if (!empty($employee->attendance_tracking_start_date)) {
                    $atsd = Carbon::parse($employee->attendance_tracking_start_date)->startOfDay();
                    if ($atsd->gt($employeeStart)) {
                        $employeeStart = $atsd->copy();
                    }
                }
                $effectiveStart = $monthStart->gt($employeeStart) ? $monthStart->copy() : $employeeStart->copy();
                $empOffDays = $this->resolveOffDaysFromRow($employee, $clientModel);

                // Expand to daily records on the fly
                $dailyPayloads = $validationService->expandToDaily(
                    $employee->id,
                    $daysPresent,
                    $daysLop,
                    $effectiveStart,
                    $monthEnd,
                    $empOffDays,
                    $clientHolidayDates,
                    $existingPunchesDatesMap[$employee->id] ?? []
                );

                foreach ($dailyPayloads as $payload) {
                    $insertChunk[] = [
                        'employee_id' => $payload['employee_id'],
                        'attendance_date' => $payload['attendance_date'],
                        'status' => $payload['status'],
                        'source' => $payload['source'],
                        'notes' => $payload['notes'] ?? null,
                        'uploaded_batch_id' => $batch->id,
                        'created_at' => $nowStr,
                        'updated_at' => $nowStr,
                    ];

                    if (count($insertChunk) >= 2000) {
                        $this->upsertAttendanceChunk($insertChunk);
                        $insertChunk = [];
                    }
                }
                $importedCount++;
            }

            if (!empty($insertChunk)) {
                $this->upsertAttendanceChunk($insertChunk);
            }

            DB::commit();

            \App\Models\AttendanceUploadBatch::create([
                'client_id' => $batch->client_id,
                'target_month' => $batch->target_month->toDateString(),
                'uploaded_file_name' => $batch->file_name,
                'total_rows' => $batch->total_rows,
                'matched_rows' => $batch->valid_count,
                'status' => 'approved',
                'uploaded_by' => $batch->user_id,
            ]);

            $batch->update([
                'status' => 'completed',
                'processed_rows' => $importedCount,
                'summary' => [
                    'imported_count' => $importedCount,
                    'ignored_errors_count' => $batch->error_count,
                ],
            ]);

            @unlink($batch->file_path);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("ProcessAttendanceBulkUploadJob failed: " . $e->getMessage());
            $batch->update([
                'status' => 'failed',
                'error_message' => 'Exception: ' . $e->getMessage(),
            ]);
            @unlink($batch->file_path);
        }
    }

    /**
     * Bulk upsert attendance records in chunks using updateOrInsert semantics.
     */
    private function upsertAttendanceChunk(array $chunk): void
    {
        // Use upsert for efficient batch insert-or-update
        DB::table('attendance_records')->upsert(
            $chunk,
            ['employee_id', 'attendance_date'],
            ['status', 'source', 'notes', 'uploaded_batch_id', 'updated_at']
        );
    }

    /**
     * Resolve the effective weekly off days array for an employee row or client.
     */
    private function resolveOffDaysFromRow($employeeRow, ?\App\Models\Client $client): array
    {
        $pattern = (!empty($employeeRow->weekly_off_pattern) ? $employeeRow->weekly_off_pattern : null)
            ?? $client?->weekly_off_pattern
            ?? 'sat,sun';
        return array_map('trim', explode(',', strtolower($pattern)));
    }

    /**
     * Resolve the effective weekly off days array for an employee/client.
     */
    private function resolveOffDays(?Employee $employee, ?\App\Models\Client $client): array
    {
        $pattern = $employee?->weekly_off_pattern
            ?? $client?->weekly_off_pattern
            ?? 'sat,sun';
        return array_map('trim', explode(',', strtolower($pattern)));
    }
}
