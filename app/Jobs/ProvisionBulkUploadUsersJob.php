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
use Illuminate\Support\Str;

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

        $existingUsersMap = User::whereNotNull('employee_id')
            ->whereIn('employee_id', $this->employeeIds)
            ->get()
            ->keyBy('employee_id');

        $allEmails = Employee::whereIn('id', $this->employeeIds)->pluck('personal_email')->filter()->all();
        $existingUserEmails = array_fill_keys(User::whereIn('email', $allEmails)->pluck('email')->all(), true);

        $now = now()->toDateTimeString();
        $expiryDate = now()->addDays(7)->toDateTimeString();
        $userBatch = [];
        $newMailables = [];

        $alreadySentUserIds = array_fill_keys(
            \Illuminate\Support\Facades\DB::table('audit_logs')->where('action', 'invitation_created')->pluck('auditable_id')->all(),
            true
        );

        $failedMailUserIds = [];
        $failedMailJobs = \Illuminate\Support\Facades\DB::table('failed_jobs')->where('payload', 'like', '%InvitationMail%')->get();
        foreach ($failedMailJobs as $fj) {
            $payload = json_decode($fj->payload, true);
            $cmd = $payload['data']['command'] ?? '';
            if (preg_match('/"App\\\\Models\\\\User";s:2:"id";i:(\d+);/', $cmd, $m)) {
                $failedMailUserIds[$m[1]] = true;
            }
        }

        foreach ($employees as $employee) {
            // 1. Idempotent Retry & Failed-Mail Recovery: Check if User account already exists
            if (isset($existingUsersMap[$employee->id])) {
                $u = $existingUsersMap[$employee->id];
                $hasFailedMail = isset($failedMailUserIds[$u->id]);
                $hasSentMail = isset($alreadySentUserIds[$u->id]);

                // Re-queue mail if user is invited AND (never sent OR previous attempt failed in failed_jobs)
                if ($u->status === 'invited' && (!$hasSentMail || $hasFailedMail)) {
                    $token = Str::random(64);
                    $u->update([
                        'invitation_token' => hash('sha256', $token),
                        'invitation_expires_at' => $expiryDate,
                    ]);
                    $newMailables[] = [
                        'email' => $u->email,
                        'token' => $token,
                        'employee_id' => $employee->id
                    ];
                }
                $successCount++;
                continue;
            }

            // 2. Conflict Check: Check if email is already taken by another user or earlier row in this batch
            if ($employee->personal_email && isset($existingUserEmails[$employee->personal_email])) {
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

            // Mark email as seen for intra-batch duplicate prevention
            if ($employee->personal_email) {
                $existingUserEmails[$employee->personal_email] = true;
            }

            $token = Str::random(64);
            $uniqueSalt = substr(md5(Str::random(32)), 0, 22);
            $uniqueDigest = substr(hash('sha256', Str::random(64)), 0, 31);

            $userBatch[] = [
                'name' => $employee->full_name,
                'email' => $employee->personal_email,
                'role' => 'employee',
                'employee_id' => $employee->id,
                'status' => 'invited',
                'password' => '$2y$04$' . $uniqueSalt . $uniqueDigest,
                'invitation_token' => hash('sha256', $token),
                'invitation_expires_at' => $expiryDate,
                'must_change_password' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $newMailables[] = [
                'email' => $employee->personal_email,
                'token' => $token,
                'employee_id' => $employee->id
            ];

            $successCount++;

            if (count($userBatch) >= 500) {
                User::insertOrIgnore($userBatch);
                $userBatch = [];
            }
        }

        if (!empty($userBatch)) {
            User::insertOrIgnore($userBatch);
            $userBatch = [];
        }

        // Queue Invitation Mails for all newly provisioned users
        if (!empty($newMailables)) {
            $createdUsers = User::whereIn('employee_id', array_column($newMailables, 'employee_id'))
                ->get()
                ->keyBy('employee_id');

            foreach ($newMailables as $item) {
                if (isset($createdUsers[$item['employee_id']])) {
                    $u = $createdUsers[$item['employee_id']];
                    $link = url("/invitation/{$item['token']}");
                    \Illuminate\Support\Facades\Mail::to($u->email)->queue(new \App\Mail\InvitationMail($link, $u));
                }
            }
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
