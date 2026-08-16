<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use Carbon\Carbon;
use Inertia\Inertia;
use App\Models\ComplianceFiling;
use App\Services\StatutoryDueDateService;
use Illuminate\Support\Facades\DB;

class ComplianceController extends Controller
{
    public function index(Request $request)
    {
        // For Phase 1, we assume the period is the current month or passed via request.
        // Usually statutory compliance happens in the month *following* the payroll month.
        // But for simplicity in Phase 1 dashboard, we look at current/requested month.
        $monthParam = $request->query('month', Carbon::now()->startOfMonth()->format('Y-m'));
        $period = Carbon::parse($monthParam)->startOfMonth();
        $periodString = $period->format('Y-m-d');

        // 1. Get real headcount per client (deduped across parent & supplementary locked runs)
        $headcountData = DB::table('payroll_run_items')
            ->join('payroll_runs', 'payroll_run_items.payroll_run_id', '=', 'payroll_runs.id')
            ->where('payroll_runs.payroll_month', $periodString)
            ->where('payroll_runs.status', 'locked')
            ->where('payroll_run_items.is_excluded', false)
            ->select('payroll_runs.client_id', 'payroll_run_items.employee_id')
            ->distinct()
            ->get();

        $clientHeadcounts = $headcountData->groupBy('client_id')->map(function ($items) {
            return $items->count();
        });

        $totalHeadcount = $clientHeadcounts->sum();

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->query('client_id')
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);

        if ($selectedClientId === 'all' || $selectedClientId === '') {
            $selectedClientId = null;
        }

        $clientsQuery = Client::with('branches')->orderBy('company_name');

        if ($request->user()->role === 'manager') {
            $clientsQuery->whereIn('id', $request->user()->getManagedClientIds());
        }

        if ($selectedClientId) {
            $clientsQuery->where('id', $selectedClientId);
        }

        $clients = $clientsQuery->get();

        $clientRegister = collect();
        $totalFilingsNeeded = 0;
        $completedFilingsCount = 0;

        foreach ($clients as $client) {
            $filings = ComplianceFiling::where('client_id', $client->id)
                ->where('period', $periodString)
                ->get()
                ->keyBy('statute');

            $states = $client->branches->pluck('state')->filter()->unique()->toArray();

            $pfDue = StatutoryDueDateService::getPfDueDate($period);
            $esiDue = StatutoryDueDateService::getEsiDueDate($period);
            $ptDue = StatutoryDueDateService::getPtDueDate($period, $states);
            $tdsDue = StatutoryDueDateService::getTdsDueDate($period);

            $resolutionService = new \App\Services\StatutoryFilingResolutionService();
            $pfRegistration = $resolutionService->resolveClientRegistrationStatus($client, 'pf');
            $esiRegistration = $resolutionService->resolveClientRegistrationStatus($client, 'esi');

            // Check generated batch tables dynamically
            $hasPfBatch = DB::table('pf_ecr_batches')->where('client_id', $client->id)->exists();
            $hasEsiBatch = DB::table('esi_monthly_batches')->where('client_id', $client->id)->exists();
            $hasPtBatch = DB::table('pt_challan_batches')->where('client_id', $client->id)->exists();
            $hasTdsBatch = DB::table('tds_24q_batches')->where('client_id', $client->id)->exists();

            $pfStatus = ($hasPfBatch || ($filings->has('pf') && $filings['pf']->status === 'filed')) ? 'filed' : ($filings->has('pf') ? $filings['pf']->status : 'pending');
            $esiStatus = ($hasEsiBatch || ($filings->has('esi') && $filings['esi']->status === 'filed')) ? 'filed' : ($filings->has('esi') ? $filings['esi']->status : 'pending');
            $ptStatus = ($hasPtBatch || ($filings->has('pt') && $filings['pt']->status === 'filed')) ? 'filed' : ($filings->has('pt') ? $filings['pt']->status : 'pending');
            $tdsStatus = ($hasTdsBatch || ($filings->has('tds') && $filings['tds']->status === 'filed')) ? 'filed' : ($filings->has('tds') ? $filings['tds']->status : 'pending');
            $clraStatus = $filings->has('clra') ? $filings['clra']->status : 'pending';

            $clientData = [
                'id' => $client->id,
                'name' => $client->company_name,
                'code' => $client->client_code,
                'headcount' => isset($clientHeadcounts[$client->id]) ? $clientHeadcounts[$client->id] : $client->employees()->where('status', 'active')->count(),
                'filings' => [
                    'pf' => [
                        'status' => $pfStatus,
                        'due_date' => $pfDue->format('d M Y'),
                        'registration' => $pfRegistration,
                    ],
                    'esi' => [
                        'status' => $esiStatus,
                        'due_date' => $esiDue->format('d M Y'),
                        'registration' => $esiRegistration,
                    ],
                    'pt' => [
                        'status' => $ptStatus,
                        'due_date' => $ptDue ? $ptDue->format('d M Y') : 'Not Applicable'
                    ],
                    'tds' => [
                        'status' => $tdsStatus,
                        'due_date' => $tdsDue->format('d M Y')
                    ],
                    'clra' => [
                        'status' => $clraStatus,
                        'due_date' => $client->clra_license_expiry 
                                        ? Carbon::parse($client->clra_license_expiry)->format('d M Y') 
                                        : 'Not Tracked'
                    ],
                ]
            ];

            foreach ($clientData['filings'] as $statute => $data) {
                $totalFilingsNeeded++;
                if ($data['status'] === 'filed') {
                    $completedFilingsCount++;
                }
            }

            $clientRegister->push($clientData);
        }

        $allStates = Client::where('status', 'active')
            ->with('branches')
            ->get()
            ->flatMap(fn($c) => $c->branches->pluck('state'))
            ->filter()
            ->unique()
            ->toArray();

        $globalPtDue = StatutoryDueDateService::getPtDueDate($period, $allStates);
        $globalTdsDue = StatutoryDueDateService::getTdsDueDate($period);

        $pfDueStr = StatutoryDueDateService::getPfDueDate($period)->format('d M Y');
        $esiDueStr = StatutoryDueDateService::getEsiDueDate($period)->format('d M Y');
        $ptDueStr = $globalPtDue ? $globalPtDue->format('d M Y') : 'Not Applicable';
        $tdsDueStr = $globalTdsDue->format('d M Y');

        return Inertia::render('Compliance/ComplianceReports', [
            'clients' => $clientRegister->values(),
            'period' => $period->format('Y-m'),
            'stats' => [
                'total_headcount' => $totalHeadcount,
                'total_filings' => $totalFilingsNeeded,
                'completed_filings' => $completedFilingsCount,
                'pending_filings' => $totalFilingsNeeded - $completedFilingsCount,
            ],
            'due_dates' => [
                'pf' => $pfDueStr,
                'esi' => $esiDueStr,
                'pt' => $ptDueStr,
                'tds' => $tdsDueStr,
            ]
        ]);
    }

    public function markFiled(Request $request)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'statute' => 'required|in:pf,esi,pt,tds,clra',
            'period' => 'required|date_format:Y-m',
            'status' => 'required|in:pending,filed'
        ]);

        $periodDate = Carbon::parse($request->period)->startOfMonth()->format('Y-m-d');

        ComplianceFiling::updateOrCreate(
            [
                'client_id' => $request->client_id,
                'statute' => $request->statute,
                'period' => $periodDate,
            ],
            [
                'status' => $request->status,
                'filed_by' => auth()->id(),
                'filed_at' => $request->status === 'filed' ? now() : null,
            ]
        );

        return back()->with('success', strtoupper($request->statute) . ' filing status updated successfully.');
    }

    /**
     * Quick-update PF Establishment Code or ESI Code Number directly from compliance modals.
     */
    public function updateClientStatutoryCode(Request $request)
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'pf_establishment_code' => 'nullable|string|max:100',
            'esi_code_number' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $client = Client::findOrFail($request->client_id);

        if ($user && $user->role === 'manager' && !$user->isManagerForClient($client->id)) {
            abort(403, 'Unauthorized to update client statutory code.');
        }

        $dataToUpdate = [];
        if ($request->has('pf_establishment_code')) {
            $code = trim((string)$request->pf_establishment_code);
            $dataToUpdate['pf_establishment_code'] = $code !== '' ? $code : null;
        }
        if ($request->has('esi_code_number')) {
            $code = trim((string)$request->esi_code_number);
            $dataToUpdate['esi_code_number'] = $code !== '' ? $code : null;
        }

        if (!empty($dataToUpdate)) {
            $client->update($dataToUpdate);
        }

        return response()->json([
            'success' => true,
            'message' => 'Client statutory code updated successfully.',
            'client' => [
                'id' => $client->id,
                'name' => $client->company_name,
                'pf_establishment_code' => $client->pf_establishment_code,
                'esi_code_number' => $client->esi_code_number,
            ]
        ]);
    }

    public function showClientDetails(Request $request, $clientId)
    {
        $user = $request->user();
        // SECURITY: enforce strict client isolation for all non-admin roles
        if ($user->role === 'manager' && !$user->isManagerForClient($clientId)) {
            abort(403, 'Unauthorized access to client compliance details.');
        }
        if ($user->role === 'client' && (int)$user->client_id !== (int)$clientId) {
            abort(403, 'Unauthorized access to client compliance details.');
        }

        $client = Client::with(['branches', 'employees' => function($q) {
            $q->where('status', 'active');
        }])->findOrFail($clientId);

        $monthParam = $request->query('month', Carbon::now()->startOfMonth()->format('Y-m'));
        $period = Carbon::parse($monthParam)->startOfMonth();
        $periodString = $period->format('Y-m-d');

        $filings = ComplianceFiling::where('client_id', $client->id)
            ->where('period', $periodString)
            ->get()
            ->keyBy('statute');

        $resolutionService = new \App\Services\StatutoryFilingResolutionService();
        $pfRegistration = $resolutionService->resolveClientRegistrationStatus($client, 'pf');
        $esiRegistration = $resolutionService->resolveClientRegistrationStatus($client, 'esi');

        $hasPfBatch = DB::table('pf_ecr_batches')->where('client_id', $client->id)->exists();
        $hasEsiBatch = DB::table('esi_monthly_batches')->where('client_id', $client->id)->exists();
        $hasPtBatch = DB::table('pt_challan_batches')->where('client_id', $client->id)->exists();
        $hasTdsBatch = DB::table('tds_24q_batches')->where('client_id', $client->id)->exists();

        $pfStatus = ($hasPfBatch || ($filings->has('pf') && $filings['pf']->status === 'filed')) ? 'filed' : ($filings->has('pf') ? $filings['pf']->status : 'pending');
        $esiStatus = ($hasEsiBatch || ($filings->has('esi') && $filings['esi']->status === 'filed')) ? 'filed' : ($filings->has('esi') ? $filings['esi']->status : 'pending');
        $ptStatus = ($hasPtBatch || ($filings->has('pt') && $filings['pt']->status === 'filed')) ? 'filed' : ($filings->has('pt') ? $filings['pt']->status : 'pending');
        $tdsStatus = ($hasTdsBatch || ($filings->has('tds') && $filings['tds']->status === 'filed')) ? 'filed' : ($filings->has('tds') ? $filings['tds']->status : 'pending');

        $pfDue = StatutoryDueDateService::getPfDueDate($period)->format('d M Y');
        $esiDue = StatutoryDueDateService::getEsiDueDate($period)->format('d M Y');
        $states = $client->branches->pluck('state')->filter()->unique()->toArray();
        $ptDue = StatutoryDueDateService::getPtDueDate($period, $states);
        $ptDueStr = $ptDue ? $ptDue->format('d M Y') : 'Not Applicable';
        $tdsDue = StatutoryDueDateService::getTdsDueDate($period)->format('d M Y');

        // SERVER-SIDE PAGINATION: load only first page (10 records) — prevents loading 1000s of records
        $perPage = (int)$request->query('per_page', 10);
        $pfPage  = (int)$request->query('pf_page', 1);
        $search  = trim($request->query('search', ''));
        $statusFilter = $request->query('status', 'all');

        $pfQuery = DB::table('pf_ecr_batches')
            ->where('client_id', $client->id)
            ->when($search, fn($q) => $q->where(fn($s) =>
                $s->where('id', 'like', "%{$search}%")
                  ->orWhere('trrn', 'like', "%{$search}%")
                  ->orWhere('challan_number', 'like', "%{$search}%")
            ))
            ->when($statusFilter !== 'all', fn($q) => $q->where('status', $statusFilter))
            ->orderBy('id', 'desc');

        $pfPaginated = $pfQuery->paginate($perPage, ['*'], 'pf_page', $pfPage);

        return Inertia::render('Compliance/ClientComplianceDetails', [
            'client' => [
                'id'       => $client->id,
                'name'     => $client->company_name,
                'code'     => $client->client_code,
                'status'   => $client->status,
                'headcount'=> $client->employees->count(),
                'pf_code'  => $client->pf_establishment_code ?: 'Not Configured',
                'esi_code' => $client->esi_establishment_code ?: ($client->esi_code_number ?: 'Not Configured'),
                'pan'      => $client->pan_number ?? 'N/A',
                'tan'      => $client->tan_number ?? 'N/A',
                'gstin'    => $client->gstin ?? 'N/A',
            ],
            'period' => $period->format('Y-m'),
            'statutory_statuses' => [
                'pf'   => [
                    'status'      => $pfStatus,
                    'registration'=> $pfRegistration,
                    'due_date'    => $pfDue,
                    'filed_on'    => $filings->has('pf') && $filings['pf']->filed_at ? Carbon::parse($filings['pf']->filed_at)->format('d M Y') : null,
                ],
                'esi'  => [
                    'status'      => $esiStatus,
                    'registration'=> $esiRegistration,
                    'due_date'    => $esiDue,
                    'filed_on'    => $filings->has('esi') && $filings['esi']->filed_at ? Carbon::parse($filings['esi']->filed_at)->format('d M Y') : null,
                ],
                'pt'   => [
                    'status'   => $ptStatus,
                    'due_date' => $ptDueStr,
                    'filed_on' => $filings->has('pt') && $filings['pt']->filed_at ? Carbon::parse($filings['pt']->filed_at)->format('d M Y') : null,
                ],
                'tds'  => [
                    'status'   => $tdsStatus,
                    'due_date' => $tdsDue,
                    'filed_on' => $filings->has('tds') && $filings['tds']->filed_at ? Carbon::parse($filings['tds']->filed_at)->format('d M Y') : null,
                ],
                'clra' => [
                    'status'   => $filings->has('clra') ? $filings['clra']->status : 'pending',
                    'due_date' => $client->clra_license_expiry ? Carbon::parse($client->clra_license_expiry)->format('d M Y') : 'Not Tracked',
                    'filed_on' => $filings->has('clra') && $filings['clra']->filed_at ? Carbon::parse($filings['clra']->filed_at)->format('d M Y') : null,
                ],
                'gstr1'=> ['status' => 'not_generated', 'due_date' => '20 ' . $period->addMonth()->format('M Y')],
            ],
            // True server-side pagination: only current page data is sent to frontend
            'pf_batches' => [
                'data'         => $pfPaginated->items(),
                'current_page' => $pfPaginated->currentPage(),
                'last_page'    => $pfPaginated->lastPage(),
                'per_page'     => $pfPaginated->perPage(),
                'total'        => $pfPaginated->total(),
                'from'         => $pfPaginated->firstItem() ?? 0,
                'to'           => $pfPaginated->lastItem() ?? 0,
            ],
        ]);
    }
}
