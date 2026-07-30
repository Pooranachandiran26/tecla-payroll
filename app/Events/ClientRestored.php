<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\Client;
use App\Models\User;

class ClientRestored implements NotifiesWatchers
{
    public function __construct(
        public Client $client,
        public User $restoredBy
    ) {}

    public function watcherCategory(): string
    {
        return 'client';
    }

    public function watcherSubject(): string
    {
        return "Client Restored: {$this->client->company_name}";
    }

    public function watcherSummary(): string
    {
        $c = $this->client;

        return implode("\n", [
            "Company: {$c->company_name}",
            "Client Code: {$c->client_code}",
            "Current Status: {$c->status}",
            "Restored By: {$this->restoredBy->name}",
        ]);
    }

    public function watcherContextUrl(): ?string
    {
        return route('clients.show', $this->client);
    }
}
