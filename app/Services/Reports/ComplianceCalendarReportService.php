<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\ComplianceFiling;
use App\Services\StatutoryDueDateService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #12: Statutory Compliance Filing Status & Due Date Calendar.
 */
class ComplianceCalendarReportService extends BaseReportService
{
    private string $activeReport = 'compliance_calendar';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'client_name'   => 'Client Partner',
            'statute'       => 'Statute Type',
            'period'        => 'Filing Month',
            'due_date'      => 'Statutory Due Date',
            'status'        => 'Filing Status',
            'filed_at'      => 'Filing Date',
            'filed_by_name' => 'Filed By User',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $month      = $this->parseMonth($filters, 'month');
        $status     = $filters['status'] ?? null;
        $search     = $filters['search'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = ComplianceFiling::query()
            ->with(['client', 'filedBy'])
            ->orderBy('period', 'desc');

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $query->whereIn('client_id', $managedIds);
        } elseif ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($month) {
            $query->where('period', $month);
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

        return $query->get()->map(function (ComplianceFiling $filing) {
            $periodDate = Carbon::parse($filing->period);
            $statute    = strtolower($filing->statute);

            $dueDateObj = match ($statute) {
                'pf'    => StatutoryDueDateService::getPfDueDate($periodDate),
                'esi'   => StatutoryDueDateService::getEsiDueDate($periodDate),
                'pt'    => StatutoryDueDateService::getPtDueDate($periodDate, ['Tamil Nadu', 'Maharashtra']),
                'tds'   => StatutoryDueDateService::getTdsDueDate($periodDate),
                default => StatutoryDueDateService::getPfDueDate($periodDate),
            };

            return [
                'client_name'   => $filing->client->company_name ?? 'Unknown',
                'statute'       => strtoupper($filing->statute),
                'period'        => $periodDate->format('M Y'),
                'due_date'      => $dueDateObj ? $dueDateObj->format('d M Y') : '15th of Month',
                'status'        => ucfirst($filing->status),
                'filed_at'      => $filing->filed_at ? Carbon::parse($filing->filed_at)->format('d M Y H:i') : '—',
                'filed_by_name' => $filing->filedBy->name ?? '—',
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_filings' => $rows->count(),
            'filed_count'   => $rows->where('status', 'Filed')->count(),
            'pending_count' => $rows->where('status', 'Pending')->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.compliance_calendar', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.compliance_calendar', $data)->render();
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
