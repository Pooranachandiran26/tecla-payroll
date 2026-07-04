<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Client;
use App\Http\Resources\ClientResource;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ClientController extends Controller
{
    use AuthorizesRequests;

    public function __construct(protected AuditService $audit) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('client_code', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%")
                  ->orWhere('pan_number', 'like', "%{$search}%");
            });
        }

        if ($contractType = $request->input('contractType')) {
            $query->where('contract_type', $contractType);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($industry = $request->input('industry')) {
            $query->where('industry', $industry);
        }

        if ($am = $request->input('am')) {
            $query->whereHas('accountManager', function($q) use ($am) {
                $q->where('name', 'like', "%{$am}%");
            });
        }

        if ($expiry = $request->input('expiry')) {
            if ($expiry === 'expired') {
                $query->where('contract_end_date', '<', now());
            } else {
                $days = (int) $expiry;
                $query->whereBetween('contract_end_date', [now(), now()->addDays($days)]);
            }
        }

        if ($onboarding = $request->input('onboarding')) {
            if ($onboarding === 'complete') {
                $query->where('status', '!=', 'onboarding');
            } else {
                $query->where('status', 'onboarding');
            }
        }

        $clients = $query->latest()->paginate(10)->withQueryString();

        return Inertia::render('Clients/ClientsList', [
            'clients' => ClientResource::collection($clients)
        ]);
    }

    public function create()
    {
        $this->authorize('create', Client::class);
        return Inertia::render('Clients/ClientForm');
    }

    public function store(StoreClientRequest $request)
    {
        $this->authorize('create', Client::class);

        $client = DB::transaction(function () use ($request) {
            $validated = $request->validated();
            $clientData = collect($validated)->except(['contacts', 'branches'])->toArray();
            
            $client = Client::create($clientData);

            if (!empty($validated['contacts'])) {
                foreach ($validated['contacts'] as $contactData) {
                    $client->contacts()->create($contactData);
                }
            }

            if (!empty($validated['branches'])) {
                foreach ($validated['branches'] as $branchData) {
                    $client->branches()->create($branchData);
                }
            }

            $this->audit->log('created', auth()->user(), $client, null, $client->toArray());

            return $client;
        });

        return redirect()->route('clients.show', $client)->with('success', 'Client created successfully.');
    }

    public function show(Client $client)
    {
        $this->authorize('view', $client);
        $client->load(['contacts', 'branches', 'documents', 'accountManager']);
        return Inertia::render('Clients/ClientDetail', [
            'client' => new ClientResource($client)
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $this->authorize('update', $client);

        if ($request->hasAny(['default_gratuity_mode', 'statutory_bonus_applicable', 'pt_state'])) {
            $this->authorize('updateStatutory', $client);
        }

        DB::transaction(function () use ($request, $client) {
            $validated = $request->validated();
            $oldValues = $client->toArray();
            
            $clientData = collect($validated)->except(['contacts', 'branches'])->toArray();
            $client->update($clientData);

            if (isset($validated['contacts'])) {
                $client->contacts()->delete();
                foreach ($validated['contacts'] as $contactData) {
                    $client->contacts()->create($contactData);
                }
            }

            if (isset($validated['branches'])) {
                $client->branches()->delete();
                foreach ($validated['branches'] as $branchData) {
                    $client->branches()->create($branchData);
                }
            }

            $this->audit->log('updated', auth()->user(), $client, $oldValues, $client->fresh()->toArray());
        });

        return redirect()->back()->with('success', 'Client updated successfully');
    }
}
