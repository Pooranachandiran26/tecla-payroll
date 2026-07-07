<?php

use App\Contracts\NotifiesWatchers;
use Illuminate\Support\Facades\Event;

class TestEvent implements NotifiesWatchers {
    public function watcherCategory(): string { return 'system'; }
    public function watcherSubject(): string { return 'Synthetic Test Event'; }
    public function watcherSummary(): string { return 'This is a test event for Phase A validation.'; }
    public function watcherContextUrl(): ?string { return null; }
}

Event::dispatch(new TestEvent());
echo "Event Dispatched.\n";
