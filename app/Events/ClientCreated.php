<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\Client;

class ClientCreated implements NotifiesWatchers
{
    public function __construct(public Client $client) {}

    public function watcherCategory(): string
    {
        return 'client';
    }

    public function watcherSubject(): string
    {
        return "New Client Onboarded: {$this->client->company_name}";
    }

    public function watcherSummary(): string
    {
        $c = $this->client;
        $am = $c->accountManager?->name ?? 'Unassigned';
        $createdBy = auth()->user()?->name ?? 'System';

        $endDate = $c->contract_end_date ?: 'Ongoing';
        return implode("\n", [
            "Company: {$c->company_name}",
            "Client Code: {$c->client_code}",
            "Industry: {$c->industry}",
            "Contract Type: {$c->contract_type}",
            "Contract Period: {$c->contract_start_date} to {$endDate}",
            "Billing Model: {$c->billing_model}",
            "Account Manager: {$am}",
            "Created By: {$createdBy}",
        ]);
    }

    public function watcherContextUrl(): ?string
    {
        return route('clients.show', $this->client);
    }
}
