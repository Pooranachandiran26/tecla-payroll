<?php

namespace App\Policies;

use App\Models\NotificationWatcher;
use App\Models\User;

class NotificationWatcherPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, NotificationWatcher $notificationWatcher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, NotificationWatcher $notificationWatcher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, NotificationWatcher $notificationWatcher): bool
    {
        return $user->isAdmin();
    }
}
