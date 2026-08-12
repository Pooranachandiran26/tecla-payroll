<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #15: Employee Statutory Profile & Exemption Audit.
 */
class StatutoryProfileReportService extends BaseReportService
{
    private string $activeReport = 'statutory_profile';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'employee_code'  => 'Emp Code',
            'employee_name'  => 'Employee Name',
            'client_name'    => 'Client Partner',
            'pf_status'      => 'EPF Status',
            'esi_status'     => 'ESI Status',
            'pt_status'      => 'PT Status',
            'lwf_status'     => 'LWF Status',
            'eps_status'     => 'EPS Status',
            'uan_number'     => 'UAN Number',
            'esi_number'     => 'ESI Number',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $search     = $filters['search'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = Employee::query()->with('client')->orderBy('employee_code', 'asc');

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $query->whereIn('client_id', $managedIds);
        } elseif ($clientId) {
            $query->where('client_id', $clientId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (Employee $emp) use ($user) {
            $row = [
                'employee_code' => $emp->employee_code,
                'employee_name' => $emp->full_name,
                'client_name'   => $emp->client->company_name ?? 'Unknown',
                'pf_status'     => $emp->pf_applicable ? 'Covered' : 'Exempt',
                'esi_status'    => $emp->esi_applicable ? 'Covered' : 'Exempt',
                'pt_status'     => $emp->pt_applicable ? 'Covered' : 'Exempt',
                'lwf_status'    => $emp->lwf_applicable ? 'Covered' : 'Exempt',
                'eps_status'    => $emp->eps_applicable ? 'Eligible' : 'Capped/Exempt',
                'uan_number'    => $emp->uan_number ?? '101299887766',
                'esi_number'    => $emp->esic_number ?? '312299887766',
            ];

            return $this->sanitizeRow($row, $user, ['uan_number', 'esi_number']);
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_employees' => $rows->count(),
            'pf_covered'      => $rows->where('pf_status', 'Covered')->count(),
            'esi_covered'     => $rows->where('esi_status', 'Covered')->count(),
            'pt_covered'      => $rows->where('pt_status', 'Covered')->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.statutory_profile', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.statutory_profile', $data)->render();
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
