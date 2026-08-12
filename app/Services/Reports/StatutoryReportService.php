<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\PayrollRunItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #3: Statutory Deduction & Contribution Register.
 */
class StatutoryReportService extends BaseReportService
{
    private string $activeReport = 'statutory_summary';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'payroll_month'             => 'Month',
            'client_name'               => 'Client Name',
            'employee_code'             => 'Emp Code',
            'employee_name'             => 'Employee Name',
            'basic_pay'                 => 'Basic Pay (₹)',
            'employee_pf'               => 'Emp PF (₹)',
            'employee_esi'              => 'Emp ESI (₹)',
            'professional_tax'          => 'PT (₹)',
            'lwf_deduction'             => 'LWF (₹)',
            'tds_deduction'             => 'TDS (₹)',
            'employer_pf'               => 'Employer PF (₹)',
            'employer_esi'              => 'Employer ESI (₹)',
            'employer_lwf'              => 'Employer LWF (₹)',
            'total_statutory_liability' => 'Total Statutory (₹)',
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

            $empPf   = (float) $item->employee_pf;
            $empEsi  = (float) $item->employee_esi;
            $pt      = (float) $item->professional_tax;
            $lwf     = (float) $item->lwf_deduction;
            $tds     = (float) $item->tds_deduction;
            $erPf    = (float) $item->employer_pf;
            $erEsi   = (float) $item->employer_esi;
            $erLwf   = (float) $item->employer_lwf;

            $totalStatutory = round($empPf + $empEsi + $pt + $lwf + $tds + $erPf + $erEsi + $erLwf, 2);

            return [
                'payroll_month'             => $run ? Carbon::parse($run->payroll_month)->format('M Y') : '—',
                'client_name'               => $client->company_name ?? 'Unknown',
                'employee_code'             => $emp->employee_code ?? '—',
                'employee_name'             => $emp->full_name ?? 'Unknown',
                'basic_pay'                 => (float) $item->basic_pay,
                'employee_pf'               => $empPf,
                'employee_esi'              => $empEsi,
                'professional_tax'          => $pt,
                'lwf_deduction'             => $lwf,
                'tds_deduction'             => $tds,
                'employer_pf'               => $erPf,
                'employer_esi'              => $erEsi,
                'employer_lwf'              => $erLwf,
                'total_statutory_liability' => $totalStatutory,
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $clientSummary = $rows->groupBy('client_name')->map(function ($rows, $clientName) {
            return [
                'client_name'       => $clientName,
                'total_employees'   => $rows->count(),
                'total_emp_pf'      => round($rows->sum('employee_pf'), 2),
                'total_emp_esi'     => round($rows->sum('employee_esi'), 2),
                'total_pt'          => round($rows->sum('professional_tax'), 2),
                'total_er_pf'       => round($rows->sum('employer_pf'), 2),
                'total_er_esi'      => round($rows->sum('employer_esi'), 2),
                'total_liability'   => round($rows->sum('total_statutory_liability'), 2),
            ];
        })->values();

        $kpis = [
            'total_rows'       => $rows->count(),
            'total_emp_stat'   => round($rows->sum('employee_pf') + $rows->sum('employee_esi') + $rows->sum('professional_tax') + $rows->sum('lwf_deduction') + $rows->sum('tds_deduction'), 2),
            'total_er_stat'    => round($rows->sum('employer_pf') + $rows->sum('employer_esi') + $rows->sum('employer_lwf'), 2),
            'total_liability'  => round($rows->sum('total_statutory_liability'), 2),
        ];

        $data = [
            'rows'          => $rows,
            'clientSummary' => $clientSummary,
            'kpis'          => $kpis,
            'userRole'      => $user->role,
            'generatedAt'   => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            try {
                $pdf = Pdf::loadView('pdf.reports.statutory_summary', $data)
                    ->setPaper('a4', 'landscape')
                    ->setOption('isRemoteEnabled', false);

                return $pdf->output();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error("StatutoryReportService PDF failed: " . $e->getMessage());
            }
        }

        return view('pdf.reports.statutory_summary', $data)->render();
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
