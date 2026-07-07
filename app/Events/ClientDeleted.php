<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\Client;
use App\Models\User;

class ClientDeleted implements NotifiesWatchers
{
    public function __construct(
        public Client $client,
        public string $reason,
        public User $deletedBy
    ) {}

    public function watcherCategory(): string
    {
        return 'client';
    }

    public function watcherSubject(): string
    {
        return "Client Deleted: {$this->client->company_name}";
    }

    public function watcherSummary(): string
    {
        $c = $this->client;

        return implode("\n", [
            "Company: {$c->company_name}",
            "Client Code: {$c->client_code}",
            "Industry: {$c->industry}",
            "Deletion Reason: {$this->reason}",
            "Deleted By: {$this->deletedBy->name}",
        ]);
    }

    public function watcherContextUrl(): ?string
    {
        // Client is soft-deleted — no detail page available
        return null;
    }
}
