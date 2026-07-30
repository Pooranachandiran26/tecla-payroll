<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\Client;

class ClientStatusChanged implements NotifiesWatchers
{
    public function __construct(
        public Client $client,
        public string $oldStatus,
        public string $newStatus
    ) {}

    public function watcherCategory(): string
    {
        return 'client';
    }

    public function watcherSubject(): string
    {
        return "Client Status Changed: {$this->client->company_name} ({$this->oldStatus} → {$this->newStatus})";
    }

    public function watcherSummary(): string
    {
        $c = $this->client;
        $changedBy = auth()->user()?->name ?? 'System';

        return implode("\n", [
            "Company: {$c->company_name}",
            "Client Code: {$c->client_code}",
            "Previous Status: {$this->oldStatus}",
            "New Status: {$this->newStatus}",
            "Changed By: {$changedBy}",
        ]);
    }

    public function watcherContextUrl(): ?string
    {
        return route('clients.show', $this->client);
    }
}
