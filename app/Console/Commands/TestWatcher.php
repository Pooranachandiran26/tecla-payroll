<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Contracts\NotifiesWatchers;
use Illuminate\Support\Facades\Event;
use App\Jobs\NotifyWatchersJob;
use App\Services\AuditService;

class TestWatcherEvent implements NotifiesWatchers {
    public function watcherCategory(): string { return 'system'; }
    public function watcherSubject(): string { return 'Synthetic Test Event'; }
    public function watcherSummary(): string { return 'This is a test event for Phase A validation.'; }
    public function watcherContextUrl(): ?string { return null; }
}

class TestWatcher extends Command
{
    protected $signature = 'app:test-watcher';
    protected $description = 'Command description';

    public function handle()
    {
        Event::dispatch(new TestWatcherEvent());
        $this->info('Test event dispatched! The queue worker will handle the email.');
    }
}
