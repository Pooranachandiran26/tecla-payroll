<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\AuditLog;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with(['user', 'auditable'])->latest();
        
        // Example filtering
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->paginate(20)->withQueryString();

        // Need to map the relations to just strings/arrays if necessary, 
        // but passing the raw paginated collection to Inertia works fine.
        return Inertia::render('Admin/ActivityLog', [
            'logs' => $logs
        ]);
    }
}
