<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * NotificationService — creates in-app notification records for Admin/Manager users.
 *
 * SCOPE BOUNDARY (v1):
 *   - Only users with role 'admin' or 'manager' receive in-app notifications.
 *   - Employees and clients are deliberately excluded from in-app notifications in this phase.
 *   - They continue to receive existing transactional emails (EmployeeQueryRespondedMail,
 *     PromotionRevisionApprovedMail, etc.) which are entirely separate and unchanged.
 *
 * ISOLATION GUARANTEE:
 *   - Every method wraps its DB insert in try-catch.
 *   - A notification write failure NEVER propagates an exception to the caller.
 *   - Controllers call send/sendToAdmins after their primary action completes; if the
 *     notification insert fails, only a Log::warning is emitted — the HTTP response
 *     from the primary action is unaffected.
 */
class NotificationService
{
    /**
     * Create a single in-app notification for a specific user.
     *
     * ISOLATION: Catches all Throwable — a DB failure here must never break
     * the calling controller action (e.g. salary revision submission must succeed
     * even if this insert fails).
     */
    public static function send(
        int $userId,
        string $type,
        string $title,
        string $body,
        ?string $url = null,
        ?array $data = null
    ): void {
        try {
            AppNotification::create([
                'user_id' => $userId,
                'type'    => $type,
                'title'   => $title,
                'body'    => $body,
                'url'     => $url,
                'data'    => $data,
                'read_at' => null,
            ]);
        } catch (\Throwable $e) {
            Log::warning("NotificationService::send failed (user_id={$userId}, type={$type}): " . $e->getMessage());
        }
    }

    /**
     * Fan-out a notification to all active admin users.
     *
     * ISOLATION: Individual per-user inserts are each wrapped in try-catch
     * inside send(), so a single failed insert does not abort the fan-out loop.
     */
    public static function sendToAdmins(
        string $type,
        string $title,
        string $body,
        ?string $url = null,
        ?array $data = null
    ): void {
        try {
            $admins = User::where('role', 'admin')
                ->where('status', 'active')
                ->pluck('id');

            foreach ($admins as $adminId) {
                static::send($adminId, $type, $title, $body, $url, $data);
            }
        } catch (\Throwable $e) {
            Log::warning("NotificationService::sendToAdmins failed (type={$type}): " . $e->getMessage());
        }
    }

    /**
     * Fan-out a notification to all active admin AND manager users.
     *
     * ISOLATION: Same as sendToAdmins — failures are logged, never thrown.
     */
    public static function sendToAdminsAndManagers(
        string $type,
        string $title,
        string $body,
        ?string $url = null,
        ?array $data = null
    ): void {
        try {
            $users = User::whereIn('role', ['admin', 'manager'])
                ->where('status', 'active')
                ->pluck('id');

            foreach ($users as $userId) {
                static::send($userId, $type, $title, $body, $url, $data);
            }
        } catch (\Throwable $e) {
            Log::warning("NotificationService::sendToAdminsAndManagers failed (type={$type}): " . $e->getMessage());
        }
    }

    /**
     * Mark a specific notification as read for a given user.
     * Returns true if updated, false if not found / wrong owner.
     */
    public static function markRead(int $notificationId, int $userId): bool
    {
        try {
            $notification = AppNotification::where('id', $notificationId)
                ->where('user_id', $userId)
                ->whereNull('read_at')
                ->first();

            if (!$notification) {
                return false;
            }

            $notification->update(['read_at' => now()]);
            return true;
        } catch (\Throwable $e) {
            Log::warning("NotificationService::markRead failed (id={$notificationId}): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Mark all unread notifications as read for a given user.
     */
    public static function markAllRead(int $userId): void
    {
        try {
            AppNotification::where('user_id', $userId)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } catch (\Throwable $e) {
            Log::warning("NotificationService::markAllRead failed (user_id={$userId}): " . $e->getMessage());
        }
    }
}
