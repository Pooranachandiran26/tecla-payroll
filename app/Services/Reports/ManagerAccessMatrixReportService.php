<?php

namespace App\Services\Reports;

use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #18: Manager Client Access & Permission Matrix (Admin-Only).
 */
class ManagerAccessMatrixReportService extends BaseReportService
{
    private string $activeReport = 'manager_access_matrix';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'manager_name'           => 'Account Manager',
            'manager_email'          => 'Email Address',
            'status'                 => 'Account Status',
            'assigned_clients_count' => 'Assigned Clients Count',
            'assigned_client_names'  => 'Assigned Client Portfolio',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to Manager Access & Permission Matrix Report is restricted to Administrator role.');
        }

        $search = $filters['search'] ?? null;

        $query = User::query()
            ->where('role', 'manager')
            ->with('managedClients')
            ->orderBy('name', 'asc');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (User $mgr) {
            $clients = $mgr->managedClients;
            $names   = $clients->pluck('company_name')->implode(', ');

            return [
                'manager_name'           => $mgr->name,
                'manager_email'          => $mgr->email,
                'status'                 => ucfirst($mgr->status ?? 'active'),
                'assigned_clients_count' => $clients->count(),
                'assigned_client_names'  => $names ?: 'None (Unassigned)',
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        if ($user->role !== 'admin') {
            abort(403, 'Access to Manager Access & Permission Matrix Report is restricted to Administrator role.');
        }

        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_managers'     => $rows->count(),
            'active_managers'    => $rows->where('status', 'Active')->count(),
            'assigned_managers'  => $rows->where('assigned_clients_count', '>', 0)->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.manager_access_matrix', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.manager_access_matrix', $data)->render();
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
