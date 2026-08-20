<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\FormBBatch;
use App\Models\PayrollRun;
use App\Services\FormBGeneratorService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FormBController extends Controller
{
    protected FormBGeneratorService $service;

    public function __construct(FormBGeneratorService $service)
    {
        $this->service = $service;
    }

    /**
     * Never trust branch_id from the request at face value. A client-scoped branch_id must
     * genuinely belong to the given client — otherwise a manually modified request could pull
     * or generate Form B data scoped to a branch that belongs to a different client entirely.
     */
    private function branchBelongsToClient(?int $branchId, int $clientId): bool
    {
        if (!$branchId) {
            return true; // no branch selected = client-wide, always valid
        }

        return ClientBranch::where('id', $branchId)->where('client_id', $clientId)->exists();
    }

    /**
     * Tenant isolation gate for every Form B operation. Admin always passes; a manager passes
     * only if $clientId is one of their own managed clients (User::isManagerForClient() wraps
     * Auth::user()->getManagedClientIds() — the same mechanism already used by index()/history()
     * and by ClientPolicy::viewDocuments() elsewhere in the app). This must always be called with
     * a client_id resolved from the database record actually being accessed (the payroll run's
     * own client_id, the batch's own client_id) — never with a client_id taken at face value from
     * the request when a more authoritative record is already in hand.
     */
    private function authorizeClientAccess(int $clientId): void
    {
        if (!Auth::user()->isManagerForClient($clientId)) {
            abort(403, 'You do not have access to this client\'s Form B data.');
        }
    }

    /**
     * Draft/incomplete clients are setup records, not operational clients (see
     * Client::scopeOperational()) — they must never be usable for Form B/statutory processing,
     * even if a request supplies their client_id directly (bypassing the dropdown, which already
     * excludes them via FormBGeneratorService::getClientsWithBranches()). Returns a 422 with a
     * clear explanation, or null if the client is operationally eligible.
     */
    private function clientEligibilityError(Client $client): ?\Illuminate\Http\JsonResponse
    {
        if ($client->isOperational()) {
            return null;
        }

        return response()->json([
            'error' => 'This client has not completed onboarding and is not yet available for Form B or other operational processing.',
        ], 422);
    }

    /**
     * This Form B module is built and legally verified only against the Tamil Nadu Labour
     * Welfare Fund Rules, 1973 (Rule 29) — there is no Karnataka/other-state implementation.
     * Returns a 422 with a clear explanation, or null if the establishment is applicable.
     */
    private function formBApplicabilityError(Client $client, ?int $branchId): ?\Illuminate\Http\JsonResponse
    {
        $context = $this->service->resolveContext($client, $branchId);

        if ($context['form_b_applicable']) {
            return null;
        }

        return response()->json([
            'error' => 'Form B (Tamil Nadu Labour Welfare Fund Rules, 1973) is not applicable for this establishment. '
                . 'Its state is "' . $context['state'] . '", but this Form B module currently only supports Tamil Nadu establishments.',
        ], 422);
    }

    /**
     * Converts the FormBGeneratorService::ensureCycleEndedForFormB() thrown exception (when the
     * payroll cycle hasn't ended and ALLOW_EARLY_FORM_B_PROCESSING isn't active) into the same
     * 422 JSON error shape used by every other Form B business-rule check in this controller.
     */
    private function earlyProcessingError(Client $client, string $payrollMonth): ?\Illuminate\Http\JsonResponse
    {
        try {
            $this->service->ensureCycleEndedForFormB($client, $payrollMonth);
            return null;
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function index(Request $request)
    {
        $user = Auth::user();

        return Inertia::render('Compliance/FormB/FormBWizard', [
            'clients' => $this->service->getClientsWithBranches($user),
            'history' => $this->service->history($user),
            'allowEarlyFormBTesting' => $this->service->isEarlyFormBProcessingAllowed(),
        ]);
    }

    public function periodSummary(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'branch_id' => 'nullable|integer|exists:client_branches,id',
            'payroll_month' => 'required|date',
        ]);

        $client = Client::findOrFail($validated['client_id']);
        $this->authorizeClientAccess($client->id);

        if ($error = $this->clientEligibilityError($client)) {
            return $error;
        }

        $payrollMonth = Carbon::parse($validated['payroll_month'])->startOfMonth()->toDateString();

        return response()->json(
            $this->service->getPeriodSummary($client, $validated['branch_id'] ?? null, $payrollMonth)
        );
    }

    public function payrollRuns(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'branch_id' => 'nullable|integer|exists:client_branches,id',
            'payroll_month' => 'required|date',
        ]);

        $client = Client::findOrFail($validated['client_id']);
        $this->authorizeClientAccess($client->id);

        if ($error = $this->clientEligibilityError($client)) {
            return $error;
        }

        $branchId = $validated['branch_id'] ?? null;

        if (!$this->branchBelongsToClient($branchId, $client->id)) {
            return response()->json([
                'error' => 'The selected branch does not belong to this client.',
            ], 422);
        }

        if ($error = $this->formBApplicabilityError($client, $branchId)) {
            return $error;
        }

        $payrollMonth = Carbon::parse($validated['payroll_month'])->startOfMonth()->toDateString();

        return response()->json($this->service->getPayrollRuns($client, $payrollMonth, $branchId));
    }

    public function reviewData(Request $request)
    {
        $validated = $request->validate([
            'payroll_run_id' => 'required|integer|exists:payroll_runs,id',
            'branch_id' => 'nullable|integer|exists:client_branches,id',
        ]);

        $run = PayrollRun::findOrFail($validated['payroll_run_id']);
        $this->authorizeClientAccess($run->client_id);

        if ($error = $this->clientEligibilityError($run->client)) {
            return $error;
        }

        $branchId = $validated['branch_id'] ?? null;

        if (!$this->branchBelongsToClient($branchId, $run->client_id)) {
            return response()->json([
                'error' => 'The selected branch does not belong to this payroll run\'s client.',
            ], 422);
        }

        if ($error = $this->formBApplicabilityError($run->client, $branchId)) {
            return $error;
        }

        if ($run->status !== 'locked') {
            return response()->json([
                'error' => 'Form B can only be generated from a locked payroll run. This payroll run is currently "' . $run->status . '".',
            ], 422);
        }

        if ($error = $this->earlyProcessingError($run->client, $run->payroll_month)) {
            return $error;
        }

        $data = $this->service->buildReviewData($run, $branchId);

        if ($branchId && $data['employee_count'] === 0) {
            return response()->json([
                'error' => 'This payroll run has no employees belonging to the selected branch. Choose a different payroll run or branch.',
            ], 422);
        }

        return response()->json($data);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'payroll_run_id' => 'required|integer|exists:payroll_runs,id',
            'branch_id' => 'nullable|integer|exists:client_branches,id',
        ]);

        $run = PayrollRun::findOrFail($validated['payroll_run_id']);
        $this->authorizeClientAccess($run->client_id);

        if ($error = $this->clientEligibilityError($run->client)) {
            return $error;
        }

        $branchId = $validated['branch_id'] ?? null;

        if (!$this->branchBelongsToClient($branchId, $run->client_id)) {
            return response()->json([
                'error' => 'The selected branch does not belong to this payroll run\'s client.',
            ], 422);
        }

        if ($error = $this->formBApplicabilityError($run->client, $branchId)) {
            return $error;
        }

        if ($run->status !== 'locked') {
            return response()->json([
                'error' => 'Form B can only be generated from a locked payroll run.',
            ], 422);
        }

        if ($error = $this->earlyProcessingError($run->client, $run->payroll_month)) {
            return $error;
        }

        $preview = $this->service->buildReviewData($run, $branchId);

        if ($branchId && $preview['employee_count'] === 0) {
            return response()->json([
                'error' => 'This payroll run has no employees belonging to the selected branch. Choose a different payroll run or branch.',
            ], 422);
        }

        try {
            $batch = $this->service->generate($run, $branchId, Auth::id());
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Form B generation failed: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'batch' => [
                'id' => $batch->id,
                'status' => $batch->status,
                'download_urls' => [
                    'pdf' => route('compliance.form_b.download', ['id' => $batch->id, 'format' => 'pdf']),
                    'xlsx' => route('compliance.form_b.download', ['id' => $batch->id, 'format' => 'xlsx']),
                    'csv' => route('compliance.form_b.download', ['id' => $batch->id, 'format' => 'csv']),
                ],
            ],
            'preview' => $preview,
        ]);
    }

    public function download(Request $request, int $id)
    {
        $format = $request->query('format', 'pdf');

        if (!in_array($format, ['pdf', 'xlsx', 'csv'])) {
            abort(400, 'Unsupported download format.');
        }

        $batch = FormBBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        return $this->service->download($id, $format);
    }

    public function history(Request $request)
    {
        $clientId = $request->query('client_id');
        return response()->json($this->service->history(Auth::user(), $clientId ? (int)$clientId : null));
    }

    public function destroy(int $id)
    {
        $batch = FormBBatch::findOrFail($id);
        $this->authorizeClientAccess($batch->client_id);

        $this->service->destroy($id);
        return response()->json(['success' => true]);
    }
}
