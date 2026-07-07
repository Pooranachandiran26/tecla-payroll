<?php

namespace App\Events;

use App\Contracts\NotifiesWatchers;
use App\Models\Client;
use App\Models\User;

class ClientSensitiveFieldChanged implements NotifiesWatchers
{
    /**
     * @param Client $client
     * @param array  $oldValues  Whitelisted old values keyed by field name
     * @param array  $newValues  Whitelisted new values keyed by field name
     */
    public function __construct(
        public Client $client,
        public array $oldValues,
        public array $newValues
    ) {}

    public function watcherCategory(): string
    {
        return 'client';
    }

    public function watcherSubject(): string
    {
        $count = count($this->newValues);
        return "Client Details Updated: {$this->client->company_name} ({$count} field" . ($count > 1 ? 's' : '') . " changed)";
    }

    public function watcherSummary(): string
    {
        $c = $this->client;
        $changedBy = auth()->user()?->name ?? 'System';
        $lines = [
            "Company: {$c->company_name}",
            "Client Code: {$c->client_code}",
            "Changed By: {$changedBy}",
            "",
            "Changes:",
        ];

        foreach ($this->newValues as $field => $newVal) {
            $oldVal = $this->oldValues[$field] ?? '(empty)';
            $newVal = $newVal ?? '(empty)';

            // Resolve account manager IDs to names
            if (in_array($field, ['account_manager_id', 'backup_account_manager_id'])) {
                $oldVal = $oldVal ? (User::find($oldVal)?->name ?? $oldVal) : '(none)';
                $newVal = $newVal ? (User::find($newVal)?->name ?? $newVal) : '(none)';
                $field = $field === 'account_manager_id' ? 'Account Manager' : 'Backup Account Manager';
            } else {
                $field = ucwords(str_replace('_', ' ', $field));
            }

            $lines[] = "  • {$field}: {$oldVal} → {$newVal}";
        }

        return implode("\n", $lines);
    }

    public function watcherContextUrl(): ?string
    {
        return route('clients.show', $this->client);
    }
}
