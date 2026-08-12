<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\AuditLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #13: User Activity & System Audit Log (Admin-Only).
 */
class AuditLogReportService extends BaseReportService
{
    private string $activeReport = 'audit_log_report';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'created_at'     => 'Timestamp',
            'user_name'      => 'User Name',
            'user_email'     => 'User Email',
            'action'         => 'Action Performed',
            'auditable_type' => 'Target Resource',
            'ip_address'     => 'IP Address',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to User Activity Audit Log Report is restricted to Administrator role.');
        }

        $search    = $filters['search'] ?? null;
        $dateRange = $this->parseDateRange($filters);

        $query = AuditLog::query()
            ->with('user')
            ->orderBy('created_at', 'desc');

        if (isset($filters['from']) || isset($filters['to'])) {
            $query->whereBetween('created_at', [
                $dateRange['from']->startOfDay()->toDateTimeString(),
                $dateRange['to']->endOfDay()->toDateTimeString(),
            ]);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('auditable_type', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        return $query->get()->map(function (AuditLog $log) {
            $target = $log->auditable_type ? class_basename($log->auditable_type) . " #{$log->auditable_id}" : 'System';

            return [
                'created_at'     => Carbon::parse($log->created_at)->format('d M Y H:i:s'),
                'user_name'      => $log->user->name ?? 'System',
                'user_email'     => $log->user->email ?? 'system@tecla.com',
                'action'         => ucfirst(str_replace('_', ' ', $log->action)),
                'auditable_type' => $target,
                'ip_address'     => $log->ip_address ?? '127.0.0.1',
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to User Activity Audit Log Report is restricted to Administrator role.');
        }

        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_logs'    => $rows->count(),
            'unique_users'  => $rows->pluck('user_email')->unique()->count(),
            'total_actions' => $rows->pluck('action')->unique()->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.audit_log_report', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.audit_log_report', $data)->render();
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
