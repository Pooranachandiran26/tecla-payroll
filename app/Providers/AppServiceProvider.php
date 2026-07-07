<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \App\Models\Employee::observe(\App\Observers\EmployeeObserver::class);
        
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Auth\Events\Failed::class,
            \App\Listeners\LoginAnomalyListener::class
        );

        // Global Notification Watcher Interceptor
        \Illuminate\Support\Facades\Event::listen('*', function ($eventName, array $data) {
            foreach ($data as $event) {
                if ($event instanceof \App\Contracts\NotifiesWatchers) {
                    \App\Jobs\NotifyWatchersJob::dispatch(
                        $event->watcherCategory(),
                        $event->watcherSubject(),
                        $event->watcherSummary(),
                        $event->watcherContextUrl()
                    );
                }
            }
        });
    }
}
