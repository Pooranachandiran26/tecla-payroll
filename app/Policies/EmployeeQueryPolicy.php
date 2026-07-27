<?php

namespace App\Policies;

use App\Models\User;
use App\Models\EmployeeQuery;
use App\Models\Client;

class EmployeeQueryPolicy
{
    public function view(User $user, EmployeeQuery $query): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'manager') {
            $assignedClientIds = Client::where('account_manager_id', $user->id)
                ->orWhere('backup_account_manager_id', $user->id)
                ->pluck('id')
                ->toArray();

            return in_array($query->client_id, $assignedClientIds);
        }

        if ($user->role === 'employee') {
            return (int)$user->employee_id === (int)$query->employee_id;
        }

        return false;
    }

    public function respond(User $user, EmployeeQuery $query): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'manager') {
            $assignedClientIds = Client::where('account_manager_id', $user->id)
                ->orWhere('backup_account_manager_id', $user->id)
                ->pluck('id')
                ->toArray();

            return in_array($query->client_id, $assignedClientIds);
        }

        return false;
    }
}
