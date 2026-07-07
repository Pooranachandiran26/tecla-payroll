<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\Client;

class ClientContractExpiring implements NotifiesWatchers
{
    public function __construct(
        public Client $client,
        public int $daysUntilExpiry
    ) {}

    public function watcherCategory(): string
    {
        return 'client';
    }

    public function watcherSubject(): string
    {
        return "Contract Expiring: {$this->client->company_name} ({$this->daysUntilExpiry} days)";
    }

    public function watcherSummary(): string
    {
        $c = $this->client;
        $am = $c->accountManager?->name ?? 'Unassigned';
        $autoRenewal = $c->auto_renewal ? 'Yes' : 'No';

        return implode("\n", [
            "Company: {$c->company_name}",
            "Client Code: {$c->client_code}",
            "Contract End Date: {$c->contract_end_date}",
            "Days Until Expiry: {$this->daysUntilExpiry}",
            "Auto Renewal: {$autoRenewal}",
            "Notice Period: {$c->notice_period_days} days",
            "Account Manager: {$am}",
        ]);
    }

    public function watcherContextUrl(): ?string
    {
        return route('clients.show', $this->client);
    }
}
