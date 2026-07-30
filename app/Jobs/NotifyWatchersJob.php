<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\NotificationWatcher;
use Illuminate\Support\Facades\Mail;
use App\Mail\SystemWatcherNotification;
use App\Services\AuditService;

class NotifyWatchersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $category;
    public $subject;
    public $summary;
    public $contextUrl;

    /**
     * Create a new job instance.
     */
    public function __construct(string $category, string $subject, string $summary, ?string $contextUrl)
    {
        $this->category = $category;
        $this->subject = $subject;
        $this->summary = $summary;
        $this->contextUrl = $contextUrl;
    }

    /**
     * Execute the job.
     */
    public function handle(AuditService $audit): void
    {
        $watchers = NotificationWatcher::where('is_active', true)->get()->filter(function ($watcher) {
            return in_array('all', $watcher->categories) || in_array($this->category, $watcher->categories);
        });

        foreach ($watchers as $watcher) {
            try {
                Mail::to($watcher->email)->send(
                    new SystemWatcherNotification(
                        $this->category,
                        $this->subject,
                        $this->summary,
                        $this->contextUrl
                    )
                );
            } catch (\Throwable $e) {
                $audit->log('watcher_notification_failed', null, null, null, null, [
                    'watcher_id' => $watcher->id,
                    'watcher_email' => $watcher->email,
                    'subject' => $this->subject,
                    'error' => $e->getMessage()
                ], '127.0.0.1');
            }
        }
    }
}
