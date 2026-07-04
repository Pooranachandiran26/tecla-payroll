<?php

namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class LoginAnomalyListener
{
    public function __construct(protected \App\Services\SettingsService $settings) {}

    public function handle(object $event): void
    {
        if ($event instanceof \Illuminate\Auth\Events\Failed) {
            $this->handleFailedLogin($event);
        }
    }

    protected function handleFailedLogin($event)
    {
        if (!$event->user) return;
        
        $maxAttempts = $this->settings->getAuthSecurity('max_failed_login_attempts_per_account', 5);
        $lockMinutes = $this->settings->getAuthSecurity('account_lockout_duration_minutes', 30);
        
        if ($event->user->failed_login_attempts >= $maxAttempts) {
            $event->user->update([
                'locked_until' => now()->addMinutes($lockMinutes),
                'status' => 'locked'
            ]);
            
            \Illuminate\Support\Facades\Log::warning("User {$event->user->email} locked out due to too many failed attempts.");
            app(\App\Services\AuditService::class)->log('account_locked', null, $event->user);
        }
    }
}
