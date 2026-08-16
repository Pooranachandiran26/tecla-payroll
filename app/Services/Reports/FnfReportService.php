<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\EmployeeExit;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #8: Full & Final Settlement (FnF) Audit Register.
 */
class FnfReportService extends BaseReportService
{
    private string $activeReport = 'fnf_register';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'employee_code'           => 'Emp Code',
            'employee_name'           => 'Employee Name',
            'client_name'             => 'Client Name',
            'last_working_day'        => 'Last Working Day',
            'exit_type'               => 'Exit Type',
            'notice_amount'           => 'Notice Pay/Recovery (₹)',
            'leave_encashment_amount' => 'Leave Encashment (₹)',
            'gratuity_amount'         => 'Gratuity (₹)',
            'loan_recovery_amount'    => 'Loan Recovery (₹)',
            'pt_shortfall_recovery'   => 'PT Shortfall (₹)',
            'net_settlement_amount'   => 'Net Settlement (₹)',
            'status'                  => 'Status',
            'bank_account_number'     => 'Bank Account',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $status     = $filters['status'] ?? null;
        $search     = $filters['search'] ?? null;
        $dateRange  = $this->parseDateRange($filters);
        $managedIds = $user->getManagedClientIds();

        $query = EmployeeExit::query()
            ->with(['employee.client'])
            ->orderBy('last_working_day', 'desc');

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
            $query->where('settlement_status', $status);
        }

        if (isset($filters['from']) || isset($filters['to'])) {
            $query->whereBetween('last_working_day', [
                $dateRange['from']->toDateString(),
                $dateRange['to']->toDateString(),
            ]);
        }

        if ($search) {
            $query->whereHas('employee', function ($eq) use ($search) {
                $eq->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (EmployeeExit $exit) use ($user) {
            $emp    = $exit->employee;
            $client = $emp?->client;

            $row = [
                'employee_code'           => $emp->employee_code ?? '—',
                'employee_name'           => $emp->full_name ?? 'Unknown',
                'client_name'             => $client->company_name ?? 'Unknown',
                'last_working_day'        => $exit->last_working_day ? Carbon::parse($exit->last_working_day)->format('d M Y') : '—',
                'exit_type'               => ucfirst(str_replace('_', ' ', $exit->exit_type ?? 'Resignation')),
                'notice_amount'           => (float) $exit->notice_amount,
                'leave_encashment_amount' => (float) $exit->leave_encashment_amount,
                'gratuity_amount'         => (float) $exit->gratuity_amount,
                'loan_recovery_amount'    => (float) $exit->loan_recovery_amount,
                'pt_shortfall_recovery'   => (float) ($exit->pt_shortfall_recovery ?? 0),
                'net_settlement_amount'   => (float) $exit->net_settlement_amount,
                'status'                  => ucfirst($exit->settlement_status ?? 'draft'),
                'bank_account_number'     => $emp->bank_account_number ?? '—',
            ];

            return $this->sanitizeRow($row, $user, ['bank_account_number']);
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_settlements'  => $rows->count(),
            'total_gratuity'     => round($rows->sum('gratuity_amount'), 2),
            'total_leave_enc'    => round($rows->sum('leave_encashment_amount'), 2),
            'total_net_disbursed'=> round($rows->sum('net_settlement_amount'), 2),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.fnf_register', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.fnf_register', $data)->render();
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
