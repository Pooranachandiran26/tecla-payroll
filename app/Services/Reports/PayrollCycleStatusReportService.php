<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\PayrollRun;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #17: Operational Payroll Cycle Status Dashboard.
 */
class PayrollCycleStatusReportService extends BaseReportService
{
    private string $activeReport = 'payroll_cycle_status';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'client_name'         => 'Client Partner',
            'payroll_month'       => 'Payroll Month',
            'cycle_status'        => 'Cycle Status',
            'employees_processed' => 'Headcount Processed',
            'gross_earnings'      => 'Gross Earnings (₹)',
            'net_disbursement'    => 'Net Disbursement (₹)',
            'employer_cost'       => 'Employer Stat Cost (₹)',
            'processed_by_name'   => 'Processed By',
            'approved_by_name'    => 'Approved By',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $month      = $this->parseMonth($filters, 'month');
        $status     = $filters['status'] ?? null;
        $search     = $filters['search'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = PayrollRun::query()
            ->with(['client', 'processedBy', 'approvedBy'])
            ->orderBy('payroll_month', 'desc');

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $query->whereIn('client_id', $managedIds);
        } elseif ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($month) {
            $query->where('payroll_month', $month);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->whereHas('client', function ($cq) use ($search) {
                $cq->where('company_name', 'like', "%{$search}%")
                  ->orWhere('client_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (PayrollRun $run) {
            return [
                'client_name'         => $run->client->company_name ?? 'Unknown',
                'payroll_month'       => Carbon::parse($run->payroll_month)->format('M Y'),
                'cycle_status'        => strtoupper($run->status),
                'employees_processed' => (int) $run->total_employees_processed,
                'gross_earnings'      => (float) $run->total_gross_earnings,
                'net_disbursement'    => (float) $run->total_net_disbursement,
                'employer_cost'       => (float) $run->total_employer_statutory_cost,
                'processed_by_name'   => $run->processedBy->name ?? 'System Admin',
                'approved_by_name'    => $run->approvedBy->name ?? 'Pending',
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_runs'   => $rows->count(),
            'locked_runs'  => $rows->where('cycle_status', 'LOCKED')->count(),
            'approved_runs'=> $rows->where('cycle_status', 'APPROVED')->count(),
            'draft_runs'   => $rows->whereIn('cycle_status', ['DRAFT', 'PROCESSING'])->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.payroll_cycle_status', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.payroll_cycle_status', $data)->render();
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
