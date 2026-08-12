<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #4: Employee Master Directory & CTC Breakdown.
 */
class EmployeeMasterReportService extends BaseReportService
{
    private string $activeReport = 'employee_master';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'employee_code'       => 'Emp Code',
            'full_name'           => 'Full Name',
            'client_name'         => 'Client Name',
            'branch_name'         => 'Branch',
            'designation'         => 'Designation',
            'date_of_joining'     => 'DOJ',
            'employment_model'    => 'Model',
            'basic_pay'           => 'Basic Pay (₹)',
            'gross_monthly_salary'=> 'Gross Monthly (₹)',
            'ctc_monthly'         => 'Monthly CTC (₹)',
            'status'              => 'Status',
            'bank_account_number' => 'Bank A/C No',
            'pan_number'          => 'PAN Number',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $search     = $filters['search'] ?? null;
        $status     = $filters['status'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = Employee::query()
            ->with(['client', 'branch'])
            ->orderBy('full_name', 'asc');

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

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('company_name', 'like', "%{$search}%");
                  });
            });
        }

        $items = $query->get();

        return $items->map(function (Employee $emp) use ($user) {
            $client = $emp->client;
            $branch = $emp->branch;

            $row = [
                'employee_code'       => $emp->employee_code,
                'full_name'           => $emp->full_name,
                'client_name'         => $client->company_name ?? 'Unknown',
                'branch_name'         => $branch->branch_name ?? 'Head Office',
                'designation'         => $emp->designation ?? '—',
                'date_of_joining'     => $emp->date_of_joining ? Carbon::parse($emp->date_of_joining)->format('d M Y') : '—',
                'employment_model'    => strtoupper($emp->employment_model ?? 'EOR'),
                'basic_pay'           => (float) $emp->basic_pay,
                'gross_monthly_salary'=> (float) $emp->gross_monthly_salary,
                'ctc_monthly'         => (float) $emp->ctc_monthly,
                'status'              => ucfirst($emp->status ?? 'active'),
                'bank_account_number' => $emp->bank_account_number,
                'pan_number'          => $emp->pan_number,
            ];

            // Reused Centralized PII Sanitization gate from BaseReportService
            return $this->sanitizeRow($row, $user, ['bank_account_number', 'pan_number']);
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $clientSummary = $rows->groupBy('client_name')->map(function ($rows, $clientName) {
            return [
                'client_name'     => $clientName,
                'total_employees' => $rows->count(),
                'total_basic'     => round($rows->sum('basic_pay'), 2),
                'total_gross'     => round($rows->sum('gross_monthly_salary'), 2),
                'total_ctc'       => round($rows->sum('ctc_monthly'), 2),
            ];
        })->values();

        $kpis = [
            'total_employees' => $rows->count(),
            'active_count'    => $rows->where('status', 'Active')->count(),
            'total_gross'     => round($rows->sum('gross_monthly_salary'), 2),
            'total_ctc'       => round($rows->sum('ctc_monthly'), 2),
        ];

        $data = [
            'rows'          => $rows,
            'clientSummary' => $clientSummary,
            'kpis'          => $kpis,
            'userRole'      => $user->role,
            'generatedAt'   => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.employee_master', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.employee_master', $data)->render();
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
