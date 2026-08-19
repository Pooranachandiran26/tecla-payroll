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
        if ($user->role === 'admin') return true;
        if ($user->role === 'manager') return $user->isManagerForClient($client->id);
        if ($user->role === 'client') return (int)$user->client_id === (int)$client->id;
        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager']);
    }

    public function update(User $user, Client $client): bool
    {
        if ($user->role === 'admin') return true;
        if ($user->role === 'manager') return $user->isManagerForClient($client->id);
        return false;
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
        if ($user->role === 'admin') return true;
        if ($user->role === 'manager') return $user->isManagerForClient($client->id);
        if ($user->role === 'client') return (int)$user->client_id === (int)$client->id;
        return false;
    }

    public function verifyDocuments(User $user, Client $client): bool
    {
        if ($user->role === 'admin') return true;
        if ($user->role === 'manager') return $user->isManagerForClient($client->id);
        return false;
    }
}
