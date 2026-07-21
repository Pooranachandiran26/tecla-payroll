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

        $clients = Client::with('branches')->orderBy('company_name')->get();

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

            $clientData = [
                'id' => $client->id,
                'name' => $client->company_name,
                'code' => $client->client_code,
                'headcount' => isset($clientHeadcounts[$client->id]) ? $clientHeadcounts[$client->id] : $client->employees()->where('status', 'active')->count(),
                'filings' => [
                    'pf' => [
                        'status' => $filings->has('pf') ? $filings['pf']->status : 'pending',
                        'due_date' => $pfDue->format('d M Y'),
                        'registration' => $pfRegistration,
                    ],
                    'esi' => [
                        'status' => $filings->has('esi') ? $filings['esi']->status : 'pending',
                        'due_date' => $esiDue->format('d M Y'),
                        'registration' => $esiRegistration,
                    ],
                    'pt' => [
                        'status' => $filings->has('pt') ? $filings['pt']->status : 'pending',
                        'due_date' => $ptDue ? $ptDue->format('d M Y') : 'Not Applicable'
                    ],
                    'tds' => [
                        'status' => $filings->has('tds') ? $filings['tds']->status : 'pending',
                        'due_date' => $tdsDue->format('d M Y')
                    ],
                    'clra' => [
                        'status' => $filings->has('clra') ? $filings['clra']->status : 'pending',
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
}
