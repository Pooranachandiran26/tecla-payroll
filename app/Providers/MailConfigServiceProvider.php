<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Schema;

class MailConfigServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Don't crash if the settings table isn't migrated yet
        try {
            if (!Schema::hasTable('settings')) {
                return;
            }
            
            // Cached read of all email settings
            $email = SettingsService::group('email'); 
        } catch (\Throwable $e) {
            return; // settings table not migrated/seeded yet — fall back silently to .env, don't crash boot
        }

        if (empty($email)) {
            return;
        }

        if (empty($email['smtp_host'])) {
            return; // nothing configured yet — keep .env defaults
        }

        if ($email['sandbox_mode'] ?? false) {
            config(['mail.default' => 'log']);
            return; // do not touch SMTP config at all in sandbox mode
        }

        config([
            'mail.mailers.smtp.host' => $email['smtp_host'] ?? '',
            'mail.mailers.smtp.port' => $email['smtp_port'] ?? 587,
            'mail.mailers.smtp.username' => $email['smtp_username'] ?? '',
            'mail.mailers.smtp.password' => $email['smtp_password'] ?? '',
            'mail.mailers.smtp.encryption' => empty($email['smtp_encryption']) || $email['smtp_encryption'] === 'none' ? null : $email['smtp_encryption'],
            'mail.from.address' => $email['from_address'] ?? 'hello@example.com',
            'mail.from.name' => $email['from_name'] ?? 'Tecla Payroll',
            'mail.default' => 'smtp',
        ]);
    }
}
