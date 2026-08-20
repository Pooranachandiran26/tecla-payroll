<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Tds24qBatch;
use App\Services\Tds24qGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class Tds24qController extends Controller
{
    protected Tds24qGeneratorService $service;

    public function __construct(Tds24qGeneratorService $service)
    {
        $this->service = $service;
    }

    /**
     * Tenant-boundary gate for every TDS 24Q action. Must always be called with a client_id
     * resolved from the client/batch record actually being accessed — never a client_id taken
     * at face value from the request — so a manager can never act on another company's data.
     */
    private function authorizeClientAccess(int $clientId): void
    {
        if (!Auth::user()->isManagerForClient($clientId)) {
            abort(403, 'You do not have access to this client\'s TDS 24Q data.');
        }
    }

    /**
     * Get Form 24Q metadata (clients list, history batches, FVU disclaimer).
     */
    public function getMetadata()
    {
        $data = $this->service->getForm24qMetadata();

        $user = Auth::user();
        if ($user->role === 'manager') {
            $managedIds = $user->getManagedClientIds();
            $data['clients'] = $data['clients']->whereIn('id', $managedIds)->values();
            $data['batches'] = $data['batches']->whereIn('client_id', $managedIds)->values();
        }

        $batches = collect($data['batches'])->map(function ($b) {
            return [
                'id' => $b->id,
                'client_name' => $b->client->company_name ?? 'N/A',
                'financial_year' => $b->financial_year,
                'assessment_year' => $b->assessment_year,
                'quarter' => $b->quarter,
                'employee_count' => $b->employee_count,
                'total_taxable_salary' => (float)$b->total_taxable_salary,
                'total_tds_deducted' => (float)$b->total_tds_deducted,
                'total_tax_deposited' => (float)$b->total_tax_deposited,
                'status' => $b->status,
                'txt_file_name' => $b->txt_file_name,
                'txt_download_url' => route('compliance.tds_24q.download', $b->id),
                'xlsx_download_url' => route('compliance.tds_24q.download_xlsx', $b->id),
                'generated_at' => $b->generated_at ? $b->generated_at->toIso8601String() : null,
            ];
        });

        return response()->json([
            'clients' => $data['clients'],
            'batches' => $batches,
            'fvu_disclaimer' => $data['fvu_disclaimer'],
        ]);
    }

    /**
     * Preview TDS 24Q dataset for selected client, FY, and quarter.
     */
    public function preview(Request $request)
    {
        $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'financial_year' => 'required|string|regex:/^\d{4}-\d{4}$/',
            'quarter' => 'required|string|in:Q1,Q2,Q3,Q4',
        ]);

        $client = Client::findOrFail((int)$request->input('client_id'));
        $this->authorizeClientAccess($client->id);

        $data = $this->service->preview24q(
            $client->id,
            $request->input('financial_year'),
            $request->input('quarter')
        );

        return response()->json($data);
    }

    /**
     * Save/update treasury challan details.
     */
    public function saveChallan(Request $request)
    {
        $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'financial_year' => 'required|string|regex:/^\d{4}-\d{4}$/',
            'quarter' => 'required|string|in:Q1,Q2,Q3,Q4',
            'bsr_code' => 'required|string|size:7',
            'deposit_date' => 'required|date_format:Y-m-d',
            'challan_serial_number' => 'required|numeric',
            'tax_amount' => 'required|numeric|min:0',
            'surcharge' => 'nullable|numeric|min:0',
            'cess' => 'nullable|numeric|min:0',
            'interest' => 'nullable|numeric|min:0',
            'fee_234e' => 'nullable|numeric|min:0',
        ]);

        $client = Client::findOrFail((int)$request->input('client_id'));
        $this->authorizeClientAccess($client->id);

        $challan = $this->service->saveChallan($request->all(), Auth::id());

        return response()->json([
            'success' => true,
            'message' => 'Treasury challan details saved successfully.',
            'challan' => $challan,
        ]);
    }

    /**
     * Generate Form 24Q `.txt` return and `.xlsx` reconciliation report.
     */
    public function generate(Request $request)
    {
        $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'financial_year' => 'required|string|regex:/^\d{4}-\d{4}$/',
            'quarter' => 'required|string|in:Q1,Q2,Q3,Q4',
            'challan' => 'nullable|array',
        ]);

        $client = Client::findOrFail((int)$request->input('client_id'));
        $this->authorizeClientAccess($client->id);

        $result = $this->service->generate24q($request->all(), Auth::id());

        return response()->json($result);
    }

    /**
     * Download official Form 24Q `.txt` return file.
     */
    public function download($id)
    {
        $batch = Tds24qBatch::findOrFail((int)$id);
        $this->authorizeClientAccess($batch->client_id);

        return $this->service->download($batch->id, 'txt', Auth::id());
    }

    /**
     * Download Form 24Q 4-sheet Excel reconciliation report.
     */
    public function downloadXlsx($id)
    {
        $batch = Tds24qBatch::findOrFail((int)$id);
        $this->authorizeClientAccess($batch->client_id);

        return $this->service->download($batch->id, 'xlsx', Auth::id());
    }
}
