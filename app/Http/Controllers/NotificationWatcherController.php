<?php

namespace App\Http\Controllers;

use App\Models\NotificationWatcher;
use App\Http\Requests\StoreNotificationWatcherRequest;
use App\Http\Requests\UpdateNotificationWatcherRequest;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class NotificationWatcherController extends Controller
{
    public function __construct(protected AuditService $audit) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', NotificationWatcher::class);
        $watchers = NotificationWatcher::with('creator:id,name')->get();
        return response()->json($watchers);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreNotificationWatcherRequest $request)
    {
        $watcher = NotificationWatcher::create(array_merge(
            $request->validated(),
            ['created_by' => auth()->id()]
        ));

        $this->audit->log('watcher_created', auth()->user(), null, null, ['watcher_id' => $watcher->id, 'email' => $watcher->email]);

        return response()->json(['message' => 'Watcher added successfully.', 'watcher' => $watcher], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateNotificationWatcherRequest $request, $id)
    {
        $watcher = NotificationWatcher::findOrFail($id);
        Gate::authorize('update', $watcher);

        $watcher->update($request->validated());

        $this->audit->log('watcher_updated', auth()->user(), null, null, [
            'watcher_id' => $watcher->id,
            'changes' => $watcher->getChanges()
        ]);

        return response()->json(['message' => 'Watcher updated successfully.', 'watcher' => $watcher]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $watcher = NotificationWatcher::findOrFail($id);
        Gate::authorize('delete', $watcher);

        $this->audit->log('watcher_deleted', auth()->user(), null, null, ['watcher_id' => $watcher->id, 'email' => $watcher->email]);
        
        $watcher->delete();

        return response()->json(['message' => 'Watcher deleted successfully.']);
    }
}
