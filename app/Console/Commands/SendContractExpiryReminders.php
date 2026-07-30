<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Client;
use App\Events\ClientContractExpiring;
use Illuminate\Support\Facades\Event;
use Carbon\Carbon;

class SendContractExpiryReminders extends Command
{
    protected $signature = 'app:send-contract-expiry-reminders {--days=30 : Number of days ahead to look for expiring contracts}';
    protected $description = 'Send watcher notifications for clients with contracts expiring within the specified window';

    public function handle(): int
    {
        $daysAhead = (int) $this->option('days');
        $cooldownDays = 7;

        $clients = Client::where('status', 'active')
            ->whereNotNull('contract_end_date')
            ->whereBetween('contract_end_date', [now(), now()->addDays($daysAhead)])
            ->where(function ($q) use ($cooldownDays) {
                $q->whereNull('contract_reminder_sent_at')
                  ->orWhere('contract_reminder_sent_at', '<', now()->subDays($cooldownDays));
            })
            ->get();

        if ($clients->isEmpty()) {
            $this->info('No contracts expiring within the next ' . $daysAhead . ' days that need reminders.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($clients as $client) {
            $daysUntilExpiry = (int) now()->diffInDays(Carbon::parse($client->contract_end_date), false);

            Event::dispatch(new ClientContractExpiring($client, $daysUntilExpiry));

            $client->update(['contract_reminder_sent_at' => now()]);
            $count++;

            $this->line("  → Reminder sent for: {$client->company_name} ({$daysUntilExpiry} days remaining)");
        }

        $this->info("Sent {$count} contract expiry reminder(s).");
        return self::SUCCESS;
    }
}
