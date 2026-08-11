<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PayrollRun;
use App\Models\Client;
use App\Models\PfEcrBatch;
use App\Models\ComplianceFiling;
use App\Services\PfEcrGeneratorService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class PfEcrController extends Controller
{
    protected PfEcrGeneratorService $generatorService;

    public function __construct(PfEcrGeneratorService $generatorService)
    {
        $this->generatorService = $generatorService;
    }

    /**
     * Get approved and locked payroll runs for ECR selection.
     */
    public function getRuns(Request $request)
    {
        $request->validate([
            'client_id' => 'nullable|string',
            'month' => 'nullable|string',
        ]);

        $query = PayrollRun::with('client')
            ->whereIn('status', ['approved', 'locked']);

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
                'run_code' => "PR-" . str_pad($run->id, 4, '0', STR_PAD_LEFT),
                'client_id' => $run->client_id,
                'client_name' => $run->client->company_name ?? 'N/A',
                'payroll_month' => Carbon::parse($run->payroll_month)->format('M Y'),
                'raw_month' => $run->payroll_month,
                'status' => $run->status,
                'total_employees' => $run->total_employees ?? 0,
                'pf_establishment_code' => $run->client->pf_establishment_code ?? '',
            ];
        });

        // Also fetch existing generated ECR batches for history
        $batches = PfEcrBatch::with(['client', 'generator'])
            ->when($request->filled('client_id'), fn($q) => $q->where('client_id', $request->client_id))
            ->orderBy('id', 'desc')
            ->take(20)
            ->get();

        return response()->json([
            'runs' => $runs,
            'batches' => $batches,
        ]);
    }

    /**
     * Preview ECR summary, totals, and validation errors for a payroll run.
     */
    public function preview(Request $request)
    {
        $request->validate([
            'payroll_run_id' => 'required|exists:payroll_runs,id',
        ]);

        $run = PayrollRun::findOrFail($request->payroll_run_id);
        $this->authorizeClientAccess($run->client_id);

        $result = $this->generatorService->preview($run->id);

        return response()->json($result);
    }

    /**
     * Generate official EPFO .txt ECR file.
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
     * Download generated .txt file.
     */
    public function download($id)
    {
        $batch = PfEcrBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        return $this->generatorService->download($batch->id, Auth::id());
    }

    /**
     * Update tracking status, TRRN, and challan reference for a batch.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,validated,generated,downloaded,submitted,accepted,rejected,filed',
            'trrn' => 'nullable|string|max:100',
            'challan_number' => 'nullable|string|max:100',
            'acknowledgement_ref' => 'nullable|string|max:100',
            'rejection_reason' => 'nullable|string',
            'remarks' => 'nullable|string',
            'sync_compliance_filings' => 'nullable|boolean',
        ]);

        $batch = PfEcrBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        $batch->update([
            'status' => $request->status,
            'trrn' => $request->filled('trrn') ? $request->trrn : $batch->trrn,
            'challan_number' => $request->filled('challan_number') ? $request->challan_number : $batch->challan_number,
            'acknowledgement_ref' => $request->filled('acknowledgement_ref') ? $request->acknowledgement_ref : $batch->acknowledgement_ref,
            'rejection_reason' => $request->rejection_reason,
            'remarks' => $request->remarks,
        ]);

        // Optional one-way status sync to existing compliance_filings
        if ($request->boolean('sync_compliance_filings') && in_array($request->status, ['submitted', 'accepted', 'filed'])) {
            ComplianceFiling::updateOrCreate(
                [
                    'client_id' => $batch->client_id,
                    'statute' => 'pf',
                    'period' => $batch->wage_month->format('Y-m-d'),
                ],
                [
                    'status' => 'filed',
                    'filed_by' => Auth::id(),
                    'filed_at' => now(),
                    'notes' => "Filed via ECR Batch #{$batch->id}. TRRN: {$batch->trrn}",
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'PF ECR batch status updated successfully.',
            'batch' => $batch->fresh(),
        ]);
    }

    /**
     * Soft delete a PF ECR batch record.
     */
    public function destroy($id)
    {
        $batch = PfEcrBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        $batch->delete(); // Soft delete via Eloquent SoftDeletes

        return response()->json([
            'success' => true,
            'message' => "PF ECR batch #{$id} soft-deleted successfully."
        ]);
    }

    /**
     * Update employee validation status in database.
     */
    public function updateEmployeeValidationStatus(Request $request, $employeeId)
    {
        $request->validate([
            'status' => 'required|string|in:Valid,Validation Error,Invalid',
        ]);

        $emp = \App\Models\Employee::findOrFail($employeeId);
        $this->authorizeClientAccess($emp->client_id);

        $emp->update([
            'pf_validation_status' => $request->status,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Employee #{$emp->employee_code} validation status updated to {$request->status}.",
            'employee_id' => $emp->id,
            'status' => $request->status,
        ]);
    }

    /**
     * Authorize user access to client resources.
     */
    private function authorizeClientAccess(int $clientId): void
    {
        $user = Auth::user();

        // Admins and Managers with compliance module permission have access
        if ($user && in_array($user->role ?? '', ['admin', 'manager'])) {
            return;
        }

        abort(403, 'Unauthorized access to client compliance records.');
    }
}
