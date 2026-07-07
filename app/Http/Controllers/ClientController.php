<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Client;
use App\Models\ClientDocument;
use App\Http\Resources\ClientResource;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ClientController extends Controller
{
    use AuthorizesRequests;

    public function __construct(protected AuditService $audit) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Client::class);

        $query = Client::withCount('employees');

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

        // SUGGESTION: The overdue filter requires the Invoicing module to be built first 
        // before we can filter on real outstanding amounts. Skipping for now.
        if ($overdue = $request->input('overdue')) {
            // $query->whereHas('invoices', function($q) { $q->where('status', 'overdue'); });
        }

        $clients = $query->latest()->paginate(20)->withQueryString();

        $stats = [
            'total' => Client::count(),
            'active' => Client::where('status', 'active')->count(),
            'onboarding' => Client::where('status', 'onboarding')->count(),
            'total_deployed' => \App\Models\Employee::where('status', 'active')->count(),
        ];

        return Inertia::render('Clients/ClientsList', [
            'clients' => ClientResource::collection($clients),
            'stats' => $stats
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $this->authorize('create', Client::class);
        $accountManagers = \App\Models\User::whereIn('role', ['admin', 'manager'])
            ->where('status', 'active')
            ->get(['id', 'name'])
            ->map(fn($u) => ['value' => $u->id, 'label' => $u->name]);
            
        return Inertia::render('Clients/ClientForm', [
            'accountManagers' => $accountManagers
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Client $client)
    {
        $this->authorize('update', $client);
        $client->load(['contacts', 'branches', 'documents']);
        
        $accountManagers = \App\Models\User::whereIn('role', ['admin', 'manager'])
            ->where('status', 'active')
            ->get(['id', 'name'])
            ->map(fn($u) => ['value' => $u->id, 'label' => $u->name]);
            
        return Inertia::render('Clients/ClientForm', [
            'client' => $client,
            'accountManagers' => $accountManagers
        ]);
    }

    public function store(StoreClientRequest $request)
    {
        $this->authorize('create', Client::class);

        $client = DB::transaction(function () use ($request) {
            $validated = $request->validated();
            $clientData = collect($validated)->except(['contacts', 'branches', 'documents', 'work_locations_count'])->toArray();
            
            $client = Client::create($clientData);

            if (!empty($validated['contacts'])) {
                foreach ($validated['contacts'] as $contactData) {
                    $client->contacts()->create($contactData);
                }
            }

            // SUGGESTION: This synthesized branch is a one-time copy of the Registered Office address at creation time.
            // If the client's registered address is edited later, this branch will NOT automatically update — 
            // the user must manually edit the branch to keep it in sync.
            if (($validated['work_locations_count'] ?? 0) == 1 && empty($validated['branches'])) {
                $validated['branches'][] = [
                    'branch_name' => 'Head Office',
                    'address_line_1' => $clientData['registered_address_line_1'] ?? null,
                    'city' => $clientData['registered_city'] ?? null,
                    'state' => $clientData['registered_state'] ?? null,
                    'pin_code' => $clientData['registered_pin'] ?? null,
                    'gstin' => $clientData['gstin'] ?? null,
                    'finance_poc_name' => $clientData['primary_poc_name'] ?? null,
                    'finance_poc_email' => $clientData['primary_poc_email'] ?? null,
                    'finance_poc_phone' => $clientData['primary_poc_phone'] ?? null,
                    'is_head_office' => true,
                    'is_primary_billing_branch' => true,
                ];
            }

            if (!empty($validated['branches'])) {
                foreach ($validated['branches'] as $branchData) {
                    unset($branchData['state_code']);
                    $client->branches()->create($branchData);
                }
            }

            if (!empty($validated['documents'])) {
                foreach ($validated['documents'] as $doc) {
                    $file = $doc['file'];
                    $path = Storage::disk('local')->put('client_documents', $file);
                    
                    $client->documents()->create([
                        'document_type' => $doc['type'],
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size_kb' => round($file->getSize() / 1024),
                        'uploaded_by' => auth()->id(),
                        'verification_status' => 'pending',
                    ]);
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
        $client->load(['contacts', 'branches', 'documents', 'accountManager', 'backupAccountManager'])
               ->loadCount('employees');
               
        $employees = $client->employees()->paginate(10);
               
        return Inertia::render('Clients/ClientDetail', [
            'client' => new ClientResource($client),
            'employees' => $employees,
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $this->authorize('update', $client);

        $statutoryFieldsChanged = false;
        if ($request->has('pt_state') && $request->pt_state !== $client->pt_state) $statutoryFieldsChanged = true;
        if ($request->has('default_gratuity_mode') && $request->default_gratuity_mode !== $client->default_gratuity_mode) $statutoryFieldsChanged = true;
        if ($request->has('statutory_bonus_applicable') && (bool)$request->statutory_bonus_applicable !== (bool)$client->statutory_bonus_applicable) $statutoryFieldsChanged = true;

        if ($statutoryFieldsChanged) {
            $this->authorize('updateStatutory', $client);
        }

        DB::transaction(function () use ($request, $client) {
            $validated = $request->validated();
            $oldValues = $client->toArray();
            
            $clientData = collect($validated)->except(['contacts', 'branches', 'documents', 'work_locations_count'])->toArray();
            $client->update($clientData);

            if (isset($validated['contacts'])) {
                $updatedContactIds = [];
                
                foreach ($validated['contacts'] as $contactData) {
                    $contactId = !empty($contactData['id']) ? $contactData['id'] : null;
                    
                    $contact = $client->contacts()->updateOrCreate(
                        ['id' => $contactId],
                        $contactData
                    );
                    
                    $updatedContactIds[] = $contact->id;
                }
                
                $client->contacts()->whereNotIn('id', $updatedContactIds)->delete();
            }

            // Note: Since work_locations_count isn't in DB, we use 1 as fallback if not provided in update
            if (($validated['work_locations_count'] ?? 1) == 1 && empty($validated['branches'])) {
                $primaryBranch = $client->branches()->where('is_primary_billing_branch', 1)->first();
                $validated['branches'][] = [
                    'id' => $primaryBranch ? $primaryBranch->id : null,
                    'branch_name' => 'Head Office',
                    'address_line_1' => $clientData['registered_address_line_1'] ?? $client->registered_address_line_1,
                    'city' => $clientData['registered_city'] ?? $client->registered_city,
                    'state' => $clientData['registered_state'] ?? $client->registered_state,
                    'pin_code' => $clientData['registered_pin'] ?? $client->registered_pin_code,
                    'gstin' => $clientData['gstin'] ?? $client->gstin,
                    'finance_poc_name' => $clientData['primary_poc_name'] ?? $client->primary_poc_name,
                    'finance_poc_email' => $clientData['primary_poc_email'] ?? $client->primary_poc_email,
                    'finance_poc_phone' => $clientData['primary_poc_phone'] ?? $client->primary_poc_phone,
                    'is_head_office' => true,
                    'is_primary_billing_branch' => true,
                ];
            }

            if (isset($validated['branches'])) {
                $updatedBranchIds = [];
                
                foreach ($validated['branches'] as $branchData) {
                    unset($branchData['state_code']);
                    $branchId = !empty($branchData['id']) ? $branchData['id'] : null;
                    
                    $branch = $client->branches()->updateOrCreate(
                        ['id' => $branchId],
                        $branchData
                    );
                    
                    $updatedBranchIds[] = $branch->id;
                }
                
                $client->branches()->whereNotIn('id', $updatedBranchIds)->delete();
            }

            $this->audit->log('updated', auth()->user(), $client, $oldValues, $client->fresh()->toArray());
        });

        return redirect()->back()->with('success', 'Client updated successfully');
    }

    public function uploadDocument(Request $request, Client $client)
    {
        $this->authorize('update', $client);

        $request->validate([
            'type' => ['required', \Illuminate\Validation\Rule::in(ClientDocument::ALLOWED_TYPES)],
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png,xlsx,xls|max:10240',
        ]);

        $file = $request->file('file');
        $path = Storage::disk('local')->put('client_documents', $file);

        $client->documents()->create([
            'document_type' => $request->type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size_kb' => round($file->getSize() / 1024),
            'uploaded_by' => auth()->id(),
            'verification_status' => 'pending',
        ]);

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    public function verifyDocument(Request $request, Client $client, ClientDocument $document)
    {
        $this->authorize('verifyDocuments', Client::class);

        $request->validate([
            'status' => 'required|in:verified,rejected',
            'reason' => 'required_if:status,rejected|nullable|string|max:255',
        ]);

        $document->update([
            'verification_status' => $request->status,
            'verified_by' => auth()->id(),
            'verified_at' => now(),
            'rejection_reason' => $request->status === 'rejected' ? $request->reason : null,
        ]);

        return redirect()->back()->with('success', 'Document verification status updated.');
    }

    public function downloadDocument(Client $client, ClientDocument $document)
    {
        $this->authorize('viewDocuments', $client);

        if (!Storage::disk('local')->exists($document->file_path)) {
            abort(404, 'Document not found.');
        }

        return Storage::disk('local')->response($document->file_path, $document->file_name);
    }
    public function destroy(Request $request, Client $client)
    {
        $this->authorize('delete', $client);

        $request->validate([
            'confirm_text' => 'required|in:DELETE',
            'reason' => 'required|string|min:10',
        ]);

        $activeEmployeesCount = $client->employees()->where('status', '!=', 'exited')->count();
        if ($activeEmployeesCount > 0) {
            return back()->withErrors(['error' => "Cannot delete: {$activeEmployeesCount} active employees are still assigned to this client. Exit or reassign them first."]);
        }

        // TODO: Update when payroll_runs are implemented
        /*
        $lockedPayrollRunsCount = $client->payrollRuns()->whereIn('status', ['approved', 'locked'])->count();
        if ($lockedPayrollRunsCount > 0) {
            return back()->withErrors(['error' => "Cannot delete: this client has {$lockedPayrollRunsCount} locked payroll run(s). Clients with payroll history cannot be deleted, only deactivated."]);
        }
        */

        DB::transaction(function () use ($client) {
            $client->branches->each(fn($b) => $b->delete());
            $client->contacts->each(fn($c) => $c->delete());
            $client->documents->each(fn($d) => $d->delete());

            // Suspend active portal users linked to this client
            $client->users->where('status', 'active')->each(function ($u) {
                $u->status = 'suspended';
                $u->suspended_reason = 'client_deleted';
                $u->save();
            });

            $client->delete();
        });

        $this->audit->log('client.deleted', auth()->user(), $client, null, ['reason' => $request->reason]);

        return redirect()->route('clients.index')->with('success', 'Client deleted successfully.');
    }

    public function deactivate(Client $client)
    {
        $this->authorize('update', $client);

        $client->update(['status' => 'inactive']);
        $this->audit->log('client.deactivated', auth()->user(), $client);

        return back()->with('success', 'Client deactivated successfully.');
    }

    public function restore($id)
    {
        $client = Client::withTrashed()->findOrFail($id);
        $this->authorize('restore', $client);

        DB::transaction(function () use ($client) {
            // Restore related models explicitly
            $client->branches()->onlyTrashed()->get()->each(fn($b) => $b->restore());
            $client->contacts()->onlyTrashed()->get()->each(fn($c) => $c->restore());
            $client->documents()->onlyTrashed()->get()->each(fn($d) => $d->restore());

            // Reactivate suspended portal users who were suspended DUE to this client deletion
            $client->users->where('suspended_reason', 'client_deleted')->each(function ($u) {
                $u->status = 'active';
                $u->suspended_reason = null;
                $u->save();
            });

            if ($client->status === 'inactive') {
                $client->status = 'active';
                $client->save();
            }
            $client->restore();
        });

        $this->audit->log('client.restored', auth()->user(), $client);

        return back()->with('success', 'Client restored successfully.');
    }

    public function statutoryDefaults(Client $client)
    {
        $this->authorize('view', $client);

        return response()->json([
            'pfApplicable' => (bool)$client->pf_applicable,
            'pfCeiling' => $client->pf_ceiling,
            'esiApplicable' => (bool)$client->esi_applicable,
            'esiLimit' => $client->esi_limit,
            'lwfApplicable' => (bool)$client->lwf_applicable,
            'lwfFrequency' => $client->lwf_frequency,
            'tdsRegime' => $client->tds_regime,
            'tdsApplicable' => (bool)$client->tds_applicable,
            'gratuityMode' => $client->default_gratuity_mode,
            'gratuityApplicable' => (bool)$client->gratuity_applicable,
            'statutoryBonusApplicable' => (bool)$client->statutory_bonus_applicable,
            'bonusRatePercentage' => $client->bonus_rate_percentage,
            'ptState' => $client->pt_state,
            'lopBasisDays' => $client->lop_basis_days,
        ]);
    }
}
