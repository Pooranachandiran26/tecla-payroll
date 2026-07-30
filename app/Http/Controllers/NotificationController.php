<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /**
     * Full paginated notification history page (Inertia).
     * Admin/Manager only — enforced by route middleware 'role:admin,manager'.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = AppNotification::forUser($user->id)
            ->orderBy('created_at', 'desc');

        // Filter by read status
        if ($request->filter === 'unread') {
            $query->unread();
        } elseif ($request->filter === 'read') {
            $query->whereNotNull('read_at');
        }

        // Filter by type
        if ($request->type && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        $notifications = $query->paginate(20)->withQueryString();

        return Inertia::render('Notifications/NotificationsIndex', [
            'notifications' => $notifications,
            'unreadCount'   => AppNotification::forUser($user->id)->unread()->count(),
            'filters'       => [
                'filter' => $request->filter ?? 'all',
                'type'   => $request->type ?? 'all',
            ],
        ]);
    }

    /**
     * Mark a specific notification as read.
     * Returns JSON for the frontend panel (non-Inertia AJAX call).
     */
    public function markRead(Request $request, int $id)
    {
        $updated = NotificationService::markRead($id, $request->user()->id);

        return response()->json(['success' => $updated]);
    }

    /**
     * Mark all notifications as read for the authenticated user.
     */
    public function readAll(Request $request)
    {
        NotificationService::markAllRead($request->user()->id);

        return redirect()->back()->with('success', 'All notifications marked as read.');
    }
}
