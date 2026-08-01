<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #11: New Joiners & Exits Headcount Movement.
 */
class HeadcountMovementReportService extends BaseReportService
{
    private string $activeReport = 'headcount_movement';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'employee_code'       => 'Emp Code',
            'employee_name'       => 'Employee Name',
            'client_name'         => 'Client Partner',
            'event_type'          => 'Movement Type',
            'event_date'          => 'Event Date',
            'designation'         => 'Designation',
            'status'              => 'Current Status',
            'bank_account_number' => 'Bank Account',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $search     = $filters['search'] ?? null;
        $dateRange  = $this->parseDateRange($filters);
        $managedIds = $user->getManagedClientIds();

        $empQuery = Employee::query()->with(['client', 'exitRequest']);

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $empQuery->whereIn('client_id', $managedIds);
        } elseif ($clientId) {
            $empQuery->where('client_id', $clientId);
        }

        if ($search) {
            $empQuery->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        $employees = $empQuery->get();
        $movements = collect();

        foreach ($employees as $emp) {
            // Check Joining Event
            if ($emp->date_of_joining) {
                $doj = Carbon::parse($emp->date_of_joining);
                if (
                    (!isset($filters['from']) && !isset($filters['to'])) ||
                    ($doj->between($dateRange['from'], $dateRange['to']))
                ) {
                    $movements->push([
                        'employee_code'       => $emp->employee_code,
                        'employee_name'       => $emp->full_name,
                        'client_name'         => $emp->client->company_name ?? 'Unknown',
                        'event_type'          => 'New Joiner',
                        'event_date'          => $doj->format('d M Y'),
                        'raw_date'            => $doj->toDateString(),
                        'designation'         => $emp->designation ?? 'Staff',
                        'status'              => ucfirst($emp->status),
                        'bank_account_number' => $emp->bank_account_number ?? '—',
                    ]);
                }
            }

            // Check Exit Event
            if ($emp->exitRequest && $emp->exitRequest->last_working_day) {
                $lwd = Carbon::parse($emp->exitRequest->last_working_day);
                if (
                    (!isset($filters['from']) && !isset($filters['to'])) ||
                    ($lwd->between($dateRange['from'], $dateRange['to']))
                ) {
                    $movements->push([
                        'employee_code'       => $emp->employee_code,
                        'employee_name'       => $emp->full_name,
                        'client_name'         => $emp->client->company_name ?? 'Unknown',
                        'event_type'          => 'Exit / Separation',
                        'event_date'          => $lwd->format('d M Y'),
                        'raw_date'            => $lwd->toDateString(),
                        'designation'         => $emp->designation ?? 'Staff',
                        'status'              => 'Exited',
                        'bank_account_number' => $emp->bank_account_number ?? '—',
                    ]);
                }
            }
        }

        return $movements->sortByDesc('raw_date')->values()->map(function ($row) use ($user) {
            unset($row['raw_date']);
            return $this->sanitizeRow($row, $user, ['bank_account_number']);
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_movements' => $rows->count(),
            'total_joiners'   => $rows->where('event_type', 'New Joiner')->count(),
            'total_exits'     => $rows->where('event_type', 'Exit / Separation')->count(),
            'net_movement'    => $rows->where('event_type', 'New Joiner')->count() - $rows->where('event_type', 'Exit / Separation')->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.headcount_movement', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.headcount_movement', $data)->render();
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
