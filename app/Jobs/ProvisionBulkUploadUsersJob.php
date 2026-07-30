<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Employee;
use App\Services\InvitationService;
use App\Services\AuditService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProvisionBulkUploadUsersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public array $employeeIds;
    public ?int $adminUserId;

    /**
     * Create a new job instance.
     */
    public function __construct(array $employeeIds, ?int $adminUserId = null)
    {
        $this->employeeIds = array_values($employeeIds);
        $this->adminUserId = $adminUserId;
    }

    /**
     * Execute the job.
     */
    public function handle(InvitationService $invitationService, AuditService $auditService): void
    {
        $adminUser = $this->adminUserId ? User::find($this->adminUserId) : null;
        $employees = Employee::whereIn('id', $this->employeeIds)->get();

        $totalCount = count($this->employeeIds);
        $successCount = 0;
        $failedCount = 0;
        $failedEmployeeIds = [];

        foreach ($employees->chunk(50) as $chunk) {
            foreach ($chunk as $employee) {
                try {
                    // Check if User already exists by employee_id or email
                    if (User::where('employee_id', $employee->id)->exists()) {
                        $failedCount++;
                        $failedEmployeeIds[] = $employee->id;
                        $auditService->log(
                            'employee.provisioning_failed',
                            $adminUser,
                            $employee,
                            null,
                            null,
                            ['reason' => 'User account already exists for employee ID ' . $employee->id, 'email' => $employee->personal_email]
                        );
                        continue;
                    }

                    if (User::where('email', $employee->personal_email)->exists()) {
                        $failedCount++;
                        $failedEmployeeIds[] = $employee->id;
                        $auditService->log(
                            'employee.provisioning_failed',
                            $adminUser,
                            $employee,
                            null,
                            null,
                            ['reason' => 'User with email ' . $employee->personal_email . ' already exists in users table', 'email' => $employee->personal_email]
                        );
                        continue;
                    }

                    $invitationService->createInvitation([
                        'name' => $employee->full_name,
                        'email' => $employee->personal_email,
                        'role' => 'employee',
                        'employee_id' => $employee->id,
                    ], true); // Force queue

                    $successCount++;
                } catch (\Throwable $e) {
                    $failedCount++;
                    $failedEmployeeIds[] = $employee->id;
                    Log::error("Failed to provision user for bulk imported employee {$employee->id}: " . $e->getMessage());

                    $auditService->log(
                        'employee.provisioning_failed',
                        $adminUser,
                        $employee,
                        null,
                        null,
                        ['error' => $e->getMessage(), 'email' => $employee->personal_email]
                    );
                }

                // Throttle 2ms per employee to prevent database/mail connection spikes
                usleep(2000);
            }

            // Pause 50ms between chunks of 50
            usleep(50000);
        }

        // Summary Audit Log
        $auditService->log(
            'employee.bulk_provisioning_completed',
            $adminUser,
            null,
            null,
            null,
            [
                'total' => $totalCount,
                'success' => $successCount,
                'failed' => $failedCount,
                'failed_employee_ids' => $failedEmployeeIds
            ]
        );

        // If any failures occurred, dispatch a system alert notification to watchers
        if ($failedCount > 0) {
            NotifyWatchersJob::dispatch(
                'system_alerts',
                'Bulk Upload User Provisioning Notice',
                "Bulk upload processed {$totalCount} employees: {$successCount} user invitations created, {$failedCount} failed.",
                route('admin.activity-log')
            );
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ProvisionBulkUploadUsersJob crashed: " . $exception->getMessage());
        try {
            $auditService = app(AuditService::class);
            $adminUser = $this->adminUserId ? User::find($this->adminUserId) : null;
            $auditService->log(
                'employee.bulk_provisioning_job_crashed',
                $adminUser,
                null,
                null,
                null,
                [
                    'error' => $exception->getMessage(),
                    'employee_ids' => $this->employeeIds
                ]
            );

            NotifyWatchersJob::dispatch(
                'system_alerts',
                'CRITICAL: Bulk Upload User Provisioning Job Failed',
                "Provisioning job for " . count($this->employeeIds) . " employees failed to complete: " . $exception->getMessage(),
                route('admin.activity-log')
            );
        } catch (\Throwable $e) {
            Log::error("Failed to log audit entry for ProvisionBulkUploadUsersJob failure: " . $e->getMessage());
        }
    }
}
