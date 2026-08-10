<?php

namespace App\Http\Controllers;

use App\Services\Gstr1GeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class Gstr1Controller extends Controller
{
    protected Gstr1GeneratorService $service;

    public function __construct(Gstr1GeneratorService $service)
    {
        $this->service = $service;
    }

    /**
     * Get available billing months and generation history.
     */
    public function getMonths()
    {
        $data = $this->service->getAvailableMonths();

        $batches = collect($data['batches'])->map(function ($b) {
            return [
                'id' => $b->id,
                'return_period' => $b->return_period,
                'invoice_count' => $b->invoice_count,
                'total_taxable_value' => (float)$b->total_taxable_value,
                'total_tax_liability' => (float)$b->total_tax_liability,
                'status' => $b->status,
                'json_file_name' => $b->json_file_name,
                'json_download_url' => route('compliance.gstr1.download', $b->id),
                'xlsx_download_url' => route('compliance.gstr1.download_xlsx', $b->id),
                'generated_at' => $b->generated_at ? $b->generated_at->toIso8601String() : null,
            ];
        });

        return response()->json([
            'months' => $data['months'],
            'batches' => $batches,
        ]);
    }

    /**
     * Preview GSTR-1 dataset.
     */
    public function preview(Request $request)
    {
        $request->validate([
            'return_period' => 'required|string|regex:/^\d{4}-\d{2}$/',
        ]);

        $data = $this->service->previewGstr1($request->input('return_period'));

        return response()->json($data);
    }

    /**
     * Generate official GSTR-1 JSON and Excel files.
     */
    public function generate(Request $request)
    {
        $request->validate([
            'return_period' => 'required|string|regex:/^\d{4}-\d{2}$/',
        ]);

        $result = $this->service->generateGstr1(
            $request->input('return_period'),
            Auth::id()
        );

        return response()->json($result);
    }

    /**
     * Download official GSTR-1 JSON file.
     */
    public function download($id)
    {
        return $this->service->download((int)$id, 'json', Auth::id());
    }

    /**
     * Download GSTR-1 Reconciliation Excel file.
     */
    public function downloadXlsx($id)
    {
        return $this->service->download((int)$id, 'xlsx', Auth::id());
    }
}
