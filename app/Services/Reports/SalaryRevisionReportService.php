<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\SalaryRevision;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #16: Salary Revision & Promotion History Audit.
 */
class SalaryRevisionReportService extends BaseReportService
{
    private string $activeReport = 'salary_revision_history';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'employee_code'   => 'Emp Code',
            'employee_name'   => 'Employee Name',
            'client_name'     => 'Client Partner',
            'effective_date'  => 'Effective Date',
            'old_designation' => 'Old Designation',
            'new_designation' => 'New Designation',
            'old_ctc'         => 'Old Monthly CTC (₹)',
            'new_ctc'         => 'New Monthly CTC (₹)',
            'increment_pct'   => 'Increment %',
            'status'          => 'Status',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $status     = $filters['status'] ?? null;
        $search     = $filters['search'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = SalaryRevision::query()
            ->with(['employee.client'])
            ->orderBy('effective_date', 'desc');

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $query->whereHas('employee', function ($eq) use ($managedIds) {
                $eq->whereIn('client_id', $managedIds);
            });
        } elseif ($clientId) {
            $query->whereHas('employee', function ($eq) use ($clientId) {
                $eq->where('client_id', $clientId);
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->whereHas('employee', function ($eq) use ($search) {
                $eq->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (SalaryRevision $rev) {
            $emp    = $rev->employee;
            $client = $emp?->client;

            $oldCtc = (float) $rev->old_ctc;
            $newCtc = (float) $rev->new_ctc;

            $pct = ($oldCtc > 0) ? round((($newCtc - $oldCtc) / $oldCtc) * 100, 2) : 0.00;

            return [
                'employee_code'   => $emp->employee_code ?? '—',
                'employee_name'   => $emp->full_name ?? 'Unknown',
                'client_name'     => $client->company_name ?? 'Unknown',
                'effective_date'  => $rev->effective_date ? Carbon::parse($rev->effective_date)->format('d M Y') : '—',
                'old_designation' => $rev->old_designation ?? ($emp->designation ?? 'Staff'),
                'new_designation' => $rev->new_designation ?? ($emp->designation ?? 'Staff'),
                'old_ctc'         => $oldCtc,
                'new_ctc'         => $newCtc,
                'increment_pct'   => ($pct >= 0 ? '+' : '') . $pct . '%',
                'status'          => ucfirst(str_replace('_', ' ', $rev->status ?? 'pending_approval')),
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_revisions' => $rows->count(),
            'approved_count'  => $rows->where('status', 'Approved')->count(),
            'pending_count'   => $rows->where('status', 'Pending')->count(),
            'avg_increment'   => $rows->count() > 0 ? round($rows->avg(fn($r) => (float)str_replace(['+', '%'], '', $r['increment_pct'])), 2) . '%' : '0.00%',
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.salary_revision_history', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.salary_revision_history', $data)->render();
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
