<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use App\Models\ClientAuditPackBatch;
use App\Models\User;
use App\Services\ClientAuditPackService;
use Illuminate\Support\Facades\Auth;

class ClientAuditPackController extends Controller
{
    protected ClientAuditPackService $service;

    public function __construct(ClientAuditPackService $service)
    {
        $this->service = $service;
    }

    public function getClients(Request $request)
    {
        $user = Auth::user();
        $query = Client::orderBy('company_name');

        // Managers only see clients they manage — same isolation the rest
        // of the compliance module already applies.
        if ($user && $user->role === 'manager' && method_exists($user, 'getManagedClientIds')) {
            $query->whereIn('id', $user->getManagedClientIds());
        }

        $batches = ClientAuditPackBatch::with('client')->orderByDesc('id')->take(20)->get();

        return response()->json([
            'clients' => $query->get(['id', 'company_name']),
            'batches' => $batches,
        ]);
    }

    public function generate(Request $request)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'period' => 'required|date_format:Y-m',
        ]);

        $this->authorizeClientAccess((int) $request->client_id);

        $result = $this->service->generate((int) $request->client_id, $request->period, Auth::id());

        return response()->json($result);
    }

    public function download($id)
    {
        $batch = ClientAuditPackBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        return $this->service->download($batch->id, Auth::id());
    }

    private function authorizeClientAccess(int $clientId): void
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (!$user || !in_array($user->role ?? '', ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to client compliance records.');
        }

        if ($user->role === 'manager' && method_exists($user, 'getManagedClientIds')
            && !in_array($clientId, $user->getManagedClientIds())) {
            abort(403, 'Unauthorized access to this client\'s compliance records.');
        }
    }
}
