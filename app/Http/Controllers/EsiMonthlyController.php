<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PayrollRun;
use App\Models\EsiMonthlyBatch;
use App\Services\EsiMonthlyContributionService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class EsiMonthlyController extends Controller
{
    protected EsiMonthlyContributionService $generatorService;

    public function __construct(EsiMonthlyContributionService $generatorService)
    {
        $this->generatorService = $generatorService;
    }

    /**
     * Locked payroll runs available for ESI Monthly Contribution generation,
     * plus recent generation history.
     */
    public function getRuns(Request $request)
    {
        $request->validate([
            'client_id' => 'nullable|string',
            'month' => 'nullable|string',
        ]);

        $query = PayrollRun::with('client')->where('status', 'locked');

        if ($request->filled('client_id') && $request->client_id !== 'all') {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('month') && $request->month !== 'all') {
            try {
                $periodString = Carbon::parse($request->month)->startOfMonth()->format('Y-m-d');
                $query->where('payroll_month', $periodString);
            } catch (\Exception $e) {
                // Invalid month format, ignore filter
            }
        }

        $runs = $query->orderBy('payroll_month', 'desc')->get()->map(function ($run) {
            return [
                'id' => $run->id,
                'run_code' => 'PR-' . str_pad($run->id, 4, '0', STR_PAD_LEFT),
                'client_id' => $run->client_id,
                'client_name' => $run->client->company_name ?? 'N/A',
                'payroll_month' => Carbon::parse($run->payroll_month)->format('M Y'),
                'status' => $run->status,
                'esi_code_number' => $run->client->esi_code_number ?? '',
            ];
        });

        $batches = EsiMonthlyBatch::with(['client', 'generator'])
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->orderBy('id', 'desc')
            ->take(20)
            ->get();

        return response()->json([
            'runs' => $runs,
            'batches' => $batches,
        ]);
    }

    /**
     * Generate the official ESIC Monthly Contribution .xls file.
     */
    public function generate(Request $request)
    {
        $request->validate([
            'payroll_run_id' => 'required|exists:payroll_runs,id',
        ]);

        $run = PayrollRun::findOrFail($request->payroll_run_id);
        $this->authorizeClientAccess($run->client_id);

        $result = $this->generatorService->generate($run->id, Auth::id());

        return response()->json($result);
    }

    /**
     * Download a previously generated .xls file.
     */
    public function download($id)
    {
        $batch = EsiMonthlyBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        return $this->generatorService->download($batch->id, Auth::id());
    }

    private function authorizeClientAccess(int $clientId): void
    {
        $user = Auth::user();

        if ($user && in_array($user->role ?? '', ['admin', 'manager'])) {
            return;
        }

        abort(403, 'Unauthorized access to client compliance records.');
    }
}
