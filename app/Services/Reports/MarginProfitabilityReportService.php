<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #7: Margin & Profitability Report (Admin-Only).
 */
class MarginProfitabilityReportService extends BaseReportService
{
    private string $activeReport = 'margin_profitability';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'client_name'             => 'Client Name',
            'invoice_month'           => 'Billing Month',
            'invoiced_excl_gst'       => 'Invoiced (Excl. GST) (₹)',
            'gross_earnings'          => 'Gross Earnings (₹)',
            'employer_statutory_cost' => 'Employer Stat Cost (₹)',
            'true_agency_margin'      => 'True Agency Margin (₹)',
            'margin_percentage'       => 'Margin %',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        // Enforce Admin Gating
        if ($user->role !== 'admin') {
            abort(403, 'Access to Margin & Profitability Report is restricted to Administrator role.');
        }

        $clientId   = $this->parseId($filters, 'client_id');
        $month      = $this->parseMonth($filters, 'month');
        $search     = $filters['search'] ?? null;
        $dateRange  = $this->parseDateRange($filters);

        $query = Invoice::query()
            ->with(['client', 'payrollRun'])
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
            $client = $inv->client;
            $run    = $inv->payrollRun;

            // Single Canonical Formula for Invoiced Excl. GST
            $invoicedExclGst = round((float)$inv->grand_total - (float)$inv->gst_amount, 2);

            $grossEarnings = $run ? (float) $run->total_gross_earnings : (float) $inv->gross_salary_passthrough;
            $erStatCost    = $run ? (float) $run->total_employer_statutory_cost : 0.00;

            // True Agency Margin formula
            $trueMargin = round($invoicedExclGst - $grossEarnings - $erStatCost, 2);
            $marginPct  = ($invoicedExclGst > 0) ? round(($trueMargin / $invoicedExclGst) * 100, 2) : 0.00;

            return [
                'client_name'             => $client->company_name ?? 'Unknown',
                'invoice_month'           => Carbon::parse($inv->invoice_month)->format('M Y'),
                'invoiced_excl_gst'       => $invoicedExclGst,
                'gross_earnings'          => $grossEarnings,
                'employer_statutory_cost' => $erStatCost,
                'true_agency_margin'      => $trueMargin,
                'margin_percentage'       => $marginPct . '%',
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to Margin & Profitability Report is restricted to Administrator role.');
        }

        $rows = $this->runForExport($filters, $user);

        $clientSummary = $rows->groupBy('client_name')->map(function ($rows, $clientName) {
            $totalInvoiced = round($rows->sum('invoiced_excl_gst'), 2);
            $totalMargin   = round($rows->sum('true_agency_margin'), 2);
            $avgMarginPct  = ($totalInvoiced > 0) ? round(($totalMargin / $totalInvoiced) * 100, 2) : 0.00;

            return [
                'client_name'     => $clientName,
                'total_invoiced'  => $totalInvoiced,
                'total_gross'     => round($rows->sum('gross_earnings'), 2),
                'total_er_stat'   => round($rows->sum('employer_statutory_cost'), 2),
                'total_margin'    => $totalMargin,
                'margin_pct'      => $avgMarginPct . '%',
            ];
        })->values();

        $totalInvoicedAll = round($rows->sum('invoiced_excl_gst'), 2);
        $totalMarginAll   = round($rows->sum('true_agency_margin'), 2);

        $kpis = [
            'total_invoiced' => $totalInvoicedAll,
            'total_gross'    => round($rows->sum('gross_earnings'), 2),
            'total_er_stat'  => round($rows->sum('employer_statutory_cost'), 2),
            'total_margin'   => $totalMarginAll,
            'overall_margin_pct' => ($totalInvoicedAll > 0) ? round(($totalMarginAll / $totalInvoicedAll) * 100, 2) . '%' : '0.00%',
        ];

        $data = [
            'rows'          => $rows,
            'clientSummary' => $clientSummary,
            'kpis'          => $kpis,
            'userRole'      => $user->role,
            'generatedAt'   => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.margin_profitability', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.margin_profitability', $data)->render();
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
