<?php

namespace App\Policies;

use App\Models\User;

class EmployeePolicy
{
    /**
     * Create a new policy instance.
     */
    public function __construct()
    {
        //
    }

    public function verifyDocuments(User $user, \App\Models\Employee $employee)
    {
        return $user->role === 'admin';
    }

    public function viewOwnProfile(User $user, \App\Models\Employee $employee)
    {
        return $user->employee_id === $employee->id;
    }

    public function delete(User $user, \App\Models\Employee $employee)
    {
        return $user->role === 'admin';
    }

    public function restore(User $user, \App\Models\Employee $employee)
    {
        return $user->role === 'admin';
    }
}
