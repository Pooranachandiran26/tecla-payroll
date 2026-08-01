<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #9: Aging Receivables & Outstanding Collections.
 */
class AgingReceivablesReportService extends BaseReportService
{
    private string $activeReport = 'aging_receivables';

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
            'due_date'           => 'Due Date',
            'days_overdue'       => 'Days Overdue',
            'aging_bucket'       => 'Aging Bucket',
            'passthrough_ctc'    => 'Pass-Through CTC (₹)',
            'agency_fee'         => 'Agency Service Fee (₹)',
            'grand_total'        => 'Grand Total (₹)',
            'status'             => 'Status',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $search     = $filters['search'] ?? null;
        $managedIds = $user->getManagedClientIds();
        $today      = now()->startOfDay();

        $query = Invoice::query()
            ->with('client')
            ->whereNotIn('status', ['paid', 'cancelled'])
            ->orderBy('due_date', 'asc');

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $query->whereIn('client_id', $managedIds);
        } elseif ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($search) {
            $query->whereHas('client', function ($cq) use ($search) {
                $cq->where('company_name', 'like', "%{$search}%")
                  ->orWhere('client_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (Invoice $inv) use ($user, $today) {
            $dueDate = Carbon::parse($inv->due_date)->startOfDay();
            $daysOverdue = $dueDate->isPast() ? (int) $dueDate->diffInDays($today) : 0;

            $bucket = match (true) {
                $daysOverdue <= 0 => 'Current (0 Days)',
                $daysOverdue <= 30 => '0–30 Days',
                $daysOverdue <= 60 => '31–60 Days',
                $daysOverdue <= 90 => '61–90 Days',
                default            => '90+ Days (Severe)',
            };

            // Manager Margin Lock: Agency Fee masked
            $feeDisplay = ($user->role === 'admin')
                ? (float) $inv->agency_service_fee
                : 'N/A (Admin Only)';

            return [
                'invoice_number'  => $inv->invoice_number,
                'client_name'     => $inv->client->company_name ?? 'Unknown',
                'invoice_month'   => Carbon::parse($inv->invoice_month)->format('M Y'),
                'due_date'        => $dueDate->format('d M Y'),
                'days_overdue'    => $daysOverdue,
                'aging_bucket'    => $bucket,
                'passthrough_ctc' => (float) $inv->gross_salary_passthrough,
                'agency_fee'      => $feeDisplay,
                'grand_total'     => (float) $inv->grand_total,
                'status'          => ucfirst($inv->status),
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $bucketSummary = [
            'Current'  => round($rows->where('aging_bucket', 'Current (0 Days)')->sum('grand_total'), 2),
            '0_30'     => round($rows->where('aging_bucket', '0–30 Days')->sum('grand_total'), 2),
            '31_60'    => round($rows->where('aging_bucket', '31–60 Days')->sum('grand_total'), 2),
            '61_90'    => round($rows->where('aging_bucket', '61–90 Days')->sum('grand_total'), 2),
            '90_plus'  => round($rows->where('aging_bucket', '90+ Days (Severe)')->sum('grand_total'), 2),
        ];

        $kpis = [
            'total_outstanding_count' => $rows->count(),
            'total_outstanding_val'   => round($rows->sum('grand_total'), 2),
            'total_overdue_val'       => round($rows->where('days_overdue', '>', 0)->sum('grand_total'), 2),
            'bucketSummary'           => $bucketSummary,
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.aging_receivables', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.aging_receivables', $data)->render();
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
