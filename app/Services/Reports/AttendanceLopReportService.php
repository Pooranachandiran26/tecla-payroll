<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\PayrollRunItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #5: Attendance & LOP Summary.
 */
class AttendanceLopReportService extends BaseReportService
{
    private string $activeReport = 'attendance_lop';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'payroll_month'     => 'Month',
            'client_name'       => 'Client Name',
            'employee_code'     => 'Emp Code',
            'employee_name'     => 'Employee Name',
            'paid_days'         => 'Paid Days',
            'lop_days'          => 'LOP Days',
            'basic_pay'         => 'Basic Pay (₹)',
            'lop_deduction'     => 'LOP Deduction (₹)',
            'net_pay'           => 'Net Pay (₹)',
            'attendance_source' => 'Attendance Source',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $month      = $this->parseMonth($filters, 'month');
        $search     = $filters['search'] ?? null;
        $dateRange  = $this->parseDateRange($filters);
        $managedIds = $user->getManagedClientIds();

        $query = PayrollRunItem::query()
            ->with(['payrollRun.client', 'employee'])
            ->where('is_excluded', false);

        // Scoping for Manager
        if ($user->role === 'manager') {
            $query->whereHas('payrollRun', function ($q) use ($managedIds) {
                $q->whereIn('client_id', $managedIds);
            });
        }

        // Filters
        if ($clientId) {
            $query->whereHas('payrollRun', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
        }

        if ($month) {
            $query->whereHas('payrollRun', function ($q) use ($month) {
                $q->where('payroll_month', $month);
            });
        } elseif (isset($filters['from']) || isset($filters['to'])) {
            $query->whereHas('payrollRun', function ($q) use ($dateRange) {
                $q->whereBetween('payroll_month', [
                    $dateRange['from']->toDateString(),
                    $dateRange['to']->toDateString(),
                ]);
            });
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->where('full_name', 'like', "%{$search}%")
                       ->orWhere('employee_code', 'like', "%{$search}%");
                })->orWhereHas('payrollRun.client', function ($cq) use ($search) {
                    $cq->where('company_name', 'like', "%{$search}%");
                });
            });
        }

        return $query->get()->map(function (PayrollRunItem $item) {
            $emp  = $item->employee;
            $run  = $item->payrollRun;
            $client = $run?->client;

            return [
                'payroll_month'     => $run ? Carbon::parse($run->payroll_month)->format('M Y') : '—',
                'client_name'       => $client->company_name ?? 'Unknown',
                'employee_code'     => $emp->employee_code ?? '—',
                'employee_name'     => $emp->full_name ?? 'Unknown',
                'paid_days'         => (float) $item->paid_days,
                'lop_days'          => (float) $item->lop_days,
                'basic_pay'         => (float) $item->basic_pay,
                'lop_deduction'     => (float) $item->lop_deduction,
                'net_pay'           => (float) $item->net_pay,
                'attendance_source' => ucfirst($item->attendance_source ?? 'upload'),
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $clientSummary = $rows->groupBy('client_name')->map(function ($rows, $clientName) {
            return [
                'client_name'        => $clientName,
                'total_employees'    => $rows->count(),
                'total_paid_days'    => $rows->sum('paid_days'),
                'total_lop_days'     => $rows->sum('lop_days'),
                'total_lop_deduction'=> round($rows->sum('lop_deduction'), 2),
            ];
        })->values();

        $kpis = [
            'total_rows'         => $rows->count(),
            'total_paid_days'    => $rows->sum('paid_days'),
            'total_lop_days'     => $rows->sum('lop_days'),
            'total_lop_deduction'=> round($rows->sum('lop_deduction'), 2),
        ];

        $data = [
            'rows'          => $rows,
            'clientSummary' => $clientSummary,
            'kpis'          => $kpis,
            'userRole'      => $user->role,
            'generatedAt'   => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.attendance_lop', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.attendance_lop', $data)->render();
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
