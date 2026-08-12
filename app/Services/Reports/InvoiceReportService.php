<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #2: Invoice & Revenue Summary (With PDF Export).
 */
class InvoiceReportService extends BaseReportService
{
    private string $activeReport = 'invoice_revenue';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'invoice_number'           => 'Invoice No',
            'client_name'              => 'Client Name',
            'invoice_month'            => 'Billing Month',
            'gross_salary_passthrough' => 'Pass-Through CTC (₹)',
            'agency_service_fee'       => 'Agency Service Fee (₹)',
            'gst_amount'               => 'GST Amount (₹)',
            'grand_total'              => 'Grand Total (₹)',
            'status'                   => 'Status',
            'due_date'                 => 'Due Date',
            'days_overdue'             => 'Days Overdue',
            'sent_at'                  => 'Sent Date',
            'po_number'                => 'PO Number',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $month      = $this->parseMonth($filters, 'month');
        $search     = $filters['search'] ?? null;
        $status     = $filters['status'] ?? null;
        $dateRange  = $this->parseDateRange($filters);
        $managedIds = $user->getManagedClientIds();

        $query = Invoice::query()
            ->with(['client', 'branch'])
            ->orderBy('created_at', 'desc');

        // Scoping for Manager
        if ($user->role === 'manager') {
            $query->whereIn('client_id', $managedIds);
        }

        // Filters
        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($status) {
            $query->where('status', $status);
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
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('company_name', 'like', "%{$search}%")
                        ->orWhere('client_code', 'like', "%{$search}%");
                  });
            });
        }

        $now = Carbon::now()->startOfDay();

        return $query->get()->map(function (Invoice $inv) use ($user, $now) {
            $client = $inv->client;
            $dueDate = $inv->due_date ? Carbon::parse($inv->due_date)->startOfDay() : null;

            // Reused Overdue logic matching CheckOverdueInvoices command
            $isOverdue = ($inv->status === 'overdue' || ($inv->status !== 'paid' && $dueDate && $dueDate->isPast()));
            $daysOverdue = ($isOverdue && $dueDate) ? (int) $dueDate->diffInDays($now) : 0;

            // Manager Margin Lock rule (New Backend Security Control)
            $agencyFee = ($user->role === 'admin')
                ? (float) $inv->agency_service_fee
                : 'N/A (Admin Only)';

            return [
                'invoice_number'           => $inv->invoice_number,
                'client_name'              => $client->company_name ?? 'Unknown',
                'invoice_month'            => Carbon::parse($inv->invoice_month)->format('M Y'),
                'gross_salary_passthrough' => (float) $inv->gross_salary_passthrough,
                'agency_service_fee'       => $agencyFee,
                'gst_amount'               => (float) $inv->gst_amount,
                'grand_total'              => (float) $inv->grand_total,
                'status'                   => ucfirst($inv->status),
                'due_date'                 => $inv->due_date ? Carbon::parse($inv->due_date)->format('d M Y') : '—',
                'days_overdue'             => $daysOverdue,
                'sent_at'                  => $inv->sent_at ? Carbon::parse($inv->sent_at)->format('d M Y H:i') : '—',
                'po_number'                => $client->po_number ?? '—',
            ];
        });
    }

    /**
     * Generate raw DomPDF binary for Executive Landscape Invoice Report.
     */
    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        // Aggregate summary metrics per client
        $clientSummary = $rows->groupBy('client_name')->map(function ($clientRows, $clientName) use ($user) {
            $totalInvoices = $clientRows->count();
            $totalPassthrough = $clientRows->sum('gross_salary_passthrough');
            $totalGst = $clientRows->sum('gst_amount');
            $totalGrand = $clientRows->sum('grand_total');

            $totalMargin = ($user->role === 'admin')
                ? $clientRows->sum(fn($r) => is_numeric($r['agency_service_fee']) ? $r['agency_service_fee'] : 0)
                : 'N/A';

            return [
                'client_name'        => $clientName,
                'total_invoices font'=> $totalInvoices,
                'total_invoices'     => $totalInvoices,
                'total_passthrough'  => $totalPassthrough,
                'total_margin font'  => $totalMargin,
                'total_margin'       => $totalMargin,
                'total_gst font'     => $totalGst,
                'total_gst'          => $totalGst,
                'total_grand'        => $totalGrand,
                'paid_count'         => $clientRows->where('status', 'Paid')->count(),
                'overdue_count'      => $clientRows->where('status', 'Overdue')->count(),
            ];
        })->values();

        $kpis = [
            'total_invoiced'    => round($rows->sum('grand_total'), 2),
            'total_collected'   => round($rows->where('status', 'Paid')->sum('grand_total'), 2),
            'total_outstanding' => round($rows->whereIn('status', ['Raised', 'Draft', 'Finalized', 'Overdue', 'Sent'])->sum('grand_total'), 2),
            'total_overdue'     => round($rows->where('status', 'Overdue')->sum('grand_total'), 2),
            'total_rows'        => $rows->count(),
        ];

        $data = [
            'rows'          => $rows,
            'clientSummary' => $clientSummary,
            'kpis'          => $kpis,
            'userRole'      => $user->role,
            'generatedAt'   => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.invoice_summary', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.invoice_summary', $data)->render();
    }

    /**
     * Download Response for PDF stream.
     */
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
