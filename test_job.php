<?php
use App\Jobs\NotifyWatchersJob;
use App\Services\AuditService;

try {
    $job = new NotifyWatchersJob('system', 'Subject', 'Summary', null);
    $job->handle(app(AuditService::class));
    echo "Job finished successfully.\n";
} catch (\Throwable $e) {
    echo "Job failed with exception: " . $e->getMessage() . "\n";
}
