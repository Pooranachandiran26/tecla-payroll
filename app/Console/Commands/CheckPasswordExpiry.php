<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckPasswordExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'auth:check-password-expiry';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Checks for expired passwords and flags users to change them.';

    /**
     * Execute the console command.
     */
    public function handle(\App\Services\SettingsService $settings)
    {
        $expiryDays = $settings->getAuthSecurity('password_expiry_days', 90);
        if ($expiryDays <= 0) {
            $this->info('Password expiry is disabled.');
            return;
        }

        $cutoff = now()->subDays($expiryDays);

        $count = \App\Models\User::where('must_change_password', false)
            ->whereNotNull('password_changed_at')
            ->where('password_changed_at', '<', $cutoff)
            ->update(['must_change_password' => true]);

        $this->info("Flagged {$count} users for password change.");
    }
}
