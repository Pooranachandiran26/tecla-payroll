<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #10: Monthly GST Filing & Tax Summary (Admin-Only).
 */
class GstTaxReportService extends BaseReportService
{
    private string $activeReport = 'gst_tax_summary';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'invoice_number'     => 'Invoice No',
            'client_name'        => 'Client Partner',
            'invoice_month'      => 'Billing Month',
            'place_of_supply'    => 'Place of Supply',
            'gst_type'           => 'GST Type',
            'taxable_agency_fee' => 'Taxable Service Fee (₹)',
            'cgst_amount'        => 'CGST (9%) (₹)',
            'sgst_amount'        => 'SGST (9%) (₹)',
            'igst_amount'        => 'IGST (18%) (₹)',
            'total_gst_amount'   => 'Total GST Liability (₹)',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to Monthly GST Tax Summary Report is restricted to Administrator role.');
        }

        $clientId  = $this->parseId($filters, 'client_id');
        $month     = $this->parseMonth($filters, 'month');
        $search    = $filters['search'] ?? null;
        $dateRange = $this->parseDateRange($filters);

        $query = Invoice::query()
            ->with('client')
            ->orderBy('invoice_month', 'desc');

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($month) {
            $query->where('invoice_month', $month);
        } elseif (isset($filters['from']) || isset($filters['to'])) {
            $query->whereBetween('invoice_month', [
                $dateRange['from']->toDateString(),
                $dateRange['to']->toDateString(),
            ]);
        }

        if ($search) {
            $query->whereHas('client', function ($cq) use ($search) {
                $cq->where('company_name', 'like', "%{$search}%")
                  ->orWhere('client_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (Invoice $inv) {
            $cgst = (float) ($inv->cgst_amount ?? ($inv->gst_type === 'cgst_sgst' ? round($inv->gst_amount / 2, 2) : 0.00));
            $sgst = (float) ($inv->sgst_amount ?? ($inv->gst_type === 'cgst_sgst' ? round($inv->gst_amount / 2, 2) : 0.00));
            $igst = (float) ($inv->igst_amount ?? ($inv->gst_type === 'igst' ? round($inv->gst_amount, 2) : 0.00));

            return [
                'invoice_number'     => $inv->invoice_number,
                'client_name'        => $inv->client->company_name ?? 'Unknown',
                'invoice_month'      => Carbon::parse($inv->invoice_month)->format('M Y'),
                'place_of_supply'    => $inv->place_of_supply_state ?? 'Tamil Nadu',
                'gst_type'           => strtoupper(str_replace('_', ' + ', $inv->gst_type ?? 'cgst_sgst')),
                'taxable_agency_fee' => (float) $inv->agency_service_fee,
                'cgst_amount'        => $cgst,
                'sgst_amount'        => $sgst,
                'igst_amount'        => $igst,
                'total_gst_amount'   => (float) $inv->gst_amount,
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to Monthly GST Tax Summary Report is restricted to Administrator role.');
        }

        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_invoices' => $rows->count(),
            'total_taxable'  => round($rows->sum('taxable_agency_fee'), 2),
            'total_cgst'     => round($rows->sum('cgst_amount'), 2),
            'total_sgst'     => round($rows->sum('sgst_amount'), 2),
            'total_igst'     => round($rows->sum('igst_amount'), 2),
            'total_gst'      => round($rows->sum('total_gst_amount'), 2),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.gst_tax_summary', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.gst_tax_summary', $data)->render();
    }

    public function pdfDownloadResponse(array $filters, User $user, string $filename): StreamedResponse
    {
        $pdfBytes = $this->generatePdfBinary($filters, $user);

        return response()->streamDownload(
            fn() => print($pdfBytes),
            $filename . '.pdf',
            [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '.pdf"',
            ]
        );
    }
}
