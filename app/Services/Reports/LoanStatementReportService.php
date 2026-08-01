<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\EmployeeLoan;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #6: Employee Loan & Advance Statement.
 */
class LoanStatementReportService extends BaseReportService
{
    private string $activeReport = 'loan_statement';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'loan_ref'         => 'Loan Ref',
            'employee_code'    => 'Emp Code',
            'employee_name'    => 'Employee Name',
            'client_name'      => 'Client Name',
            'loan_type'        => 'Loan Type',
            'principal_amount' => 'Principal (₹)',
            'monthly_emi'      => 'EMI (₹)',
            'total_repaid'     => 'Recovered (₹)',
            'remaining_balance'=> 'Outstanding (₹)',
            'status'           => 'Status',
            'start_date'       => 'Start Date',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $search     = $filters['search'] ?? null;
        $status     = $filters['status'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = EmployeeLoan::query()
            ->with(['employee.client'])
            ->orderBy('id', 'desc');

        // Scoping for Manager
        if ($user->role === 'manager') {
            $query->whereHas('employee', function ($q) use ($managedIds) {
                $q->whereIn('client_id', $managedIds);
            });
        }

        // Filters
        if ($clientId) {
            $query->whereHas('employee', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('loan_type', 'like', "%{$search}%")
                  ->orWhereHas('employee', function ($eq) use ($search) {
                      $eq->where('full_name', 'like', "%{$search}%")
                         ->orWhere('employee_code', 'like', "%{$search}%");
                  });
            });
        }

        return $query->get()->map(function (EmployeeLoan $loan) {
            $emp    = $loan->employee;
            $client = $emp?->client;

            return [
                'loan_ref'         => $loan->loan_number ?: ('LN-' . str_pad($loan->id, 5, '0', STR_PAD_LEFT)),
                'employee_code'    => $emp->employee_code ?? '—',
                'employee_name'    => $emp->full_name ?? 'Unknown',
                'client_name'      => $client->company_name ?? 'Unknown',
                'loan_type'        => ucfirst(str_replace('_', ' ', $loan->loan_type ?? 'Salary Advance')),
                'principal_amount' => (float) $loan->principal_amount,
                'monthly_emi'      => (float) $loan->monthly_emi,
                'total_repaid'     => (float) $loan->total_repaid,
                'remaining_balance'=> (float) $loan->remaining_balance,
                'status'           => ucfirst($loan->status ?? 'active'),
                'start_date'       => $loan->start_date ? Carbon::parse($loan->start_date)->format('d M Y') : '—',
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $clientSummary = $rows->groupBy('client_name')->map(function ($rows, $clientName) {
            return [
                'client_name'        => $clientName,
                'total_loans'        => $rows->count(),
                'total_principal'    => round($rows->sum('principal_amount'), 2),
                'total_repaid'       => round($rows->sum('total_repaid'), 2),
                'total_outstanding'  => round($rows->sum('remaining_balance'), 2),
            ];
        })->values();

        $kpis = [
            'total_loans'       => $rows->count(),
            'total_principal'   => round($rows->sum('principal_amount'), 2),
            'total_repaid'      => round($rows->sum('total_repaid'), 2),
            'total_outstanding' => round($rows->sum('remaining_balance'), 2),
        ];

        $data = [
            'rows'          => $rows,
            'clientSummary' => $clientSummary,
            'kpis'          => $kpis,
            'userRole'      => $user->role,
            'generatedAt'   => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.loan_statement', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.loan_statement', $data)->render();
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
