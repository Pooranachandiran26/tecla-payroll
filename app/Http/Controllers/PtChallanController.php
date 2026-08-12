<?php

namespace App\Http\Controllers;

use App\Models\PayrollRun;
use App\Models\PtChallanBatch;
use App\Services\PtChallanGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PtChallanController extends Controller
{
    protected PtChallanGeneratorService $service;

    public function __construct(PtChallanGeneratorService $service)
    {
        $this->service = $service;
    }

    /**
     * Get available locked payroll runs and PT batch history.
     */
    public function getRuns(Request $request)
    {
        $user = Auth::user();
        $month = $request->query('month');

        $query = PayrollRun::with('client')
            ->where('status', 'locked')
            ->whereNotIn('id', PtChallanBatch::select('payroll_run_id'));

        if ($user->role === 'client' && $user->client_id) {
            $query->where('client_id', $user->client_id);
        }

        if ($month && $month !== 'all') {
            $query->where('payroll_month', $month);
        }

        $runs = $query->orderBy('payroll_month', 'desc')->get()->map(function ($run) {
            return [
                'id' => $run->id,
                'client_name' => $run->client->company_name ?? 'N/A',
                'payroll_month' => $run->payroll_month,
                'status' => $run->status,
            ];
        });

        $batchesQuery = PtChallanBatch::with(['client', 'payrollRun']);

        if ($user->role === 'client' && $user->client_id) {
            $batchesQuery->where('client_id', $user->client_id);
        }

        if ($month && $month !== 'all') {
            $batchesQuery->where('wage_month', $month);
        }

        $batches = $batchesQuery->orderBy('created_at', 'desc')->get()->map(function ($b) {
            return [
                'id' => $b->id,
                'client_name' => $b->client->company_name ?? 'N/A',
                'wage_month' => $b->wage_month,
                'employee_count' => $b->employee_count,
                'total_pt_amount' => (float)$b->total_pt_amount,
                'status' => $b->status,
                'trrn_number' => $b->trrn_number,
                'challan_number' => $b->challan_number,
                'generated_at' => $b->generated_at ? $b->generated_at->format('Y-m-d H:i') : null,
                'download_url' => route('compliance.pt_challan.download', $b->id),
            ];
        });

        return response()->json([
            'runs' => $runs,
            'batches' => $batches,
        ]);
    }

    /**
     * Preview PT breakdown for a run.
     */
    public function preview(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|integer']);

        $res = $this->service->preview((int)$request->payroll_run_id);
        return response()->json($res);
    }

    /**
     * Generate PT Challan (.xlsx) report.
     */
    public function generate(Request $request)
    {
        $request->validate(['payroll_run_id' => 'required|integer']);

        $res = $this->service->generate((int)$request->payroll_run_id, Auth::id());
        return response()->json($res);
    }

    /**
     * Stream download PT report.
     */
    public function download(int $id)
    {
        return $this->service->download($id, Auth::id());
    }

    /**
     * Update payment TRRN / Challan status.
     */
    public function updateStatus(Request $request, int $id)
    {
        $request->validate([
            'status' => 'required|string|in:generated,downloaded,filed',
            'trrn_number' => 'nullable|string|max:100',
            'challan_number' => 'nullable|string|max:100',
        ]);

        $batch = PtChallanBatch::findOrFail($id);
        $batch->update([
            'status' => $request->status,
            'trrn_number' => $request->trrn_number,
            'challan_number' => $request->challan_number,
            'updated_by' => Auth::id(),
        ]);

        return response()->json(['success' => true, 'batch' => $batch]);
    }

    /**
     * Soft delete batch tracking.
     */
    public function destroy(int $id)
    {
        $batch = PtChallanBatch::findOrFail($id);
        $batch->delete();

        return response()->json(['success' => true]);
    }
}
