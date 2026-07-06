<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ClientPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager']);
    }

    public function view(User $user, Client $client): bool
    {
        return in_array($user->role, ['admin', 'manager'])
            || ($user->role === 'client' && $user->client_id === $client->id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager']);
    }

    public function update(User $user, Client $client): bool
    {
        return in_array($user->role, ['admin', 'manager']);
    }

    public function updateStatutory(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function delete(User $user, Client $client): bool
    {
        return $user->role === 'admin';
    }

    public function restore(User $user, Client $client): bool
    {
        return $user->role === 'admin';
    }

    public function viewDocuments(User $user, Client $client): bool
    {
        return in_array($user->role, ['admin', 'manager'])
            || ($user->role === 'client' && $user->client_id === $client->id);
    }

    public function verifyDocuments(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager']);
    }
}
