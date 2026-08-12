<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\Client;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service for Report #14: Client Master Directory & Commercial Terms.
 */
class ClientMasterReportService extends BaseReportService
{
    private string $activeReport = 'client_master';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function getColumns(): array
    {
        return [
            'client_code'        => 'Client Code',
            'company_name'       => 'Company Name',
            'industry'           => 'Industry',
            'contract_type'      => 'Contract Type',
            'billing_model'      => 'Billing Model',
            'commercial_rate'    => 'Rate / Fee',
            'primary_poc_name'   => 'Primary Contact',
            'primary_poc_email'  => 'POC Email',
            'status'             => 'Status',
        ];
    }

    public function getData(array $filters, User $user): Collection
    {
        $clientId   = $this->parseId($filters, 'client_id');
        $status     = $filters['status'] ?? null;
        $search     = $filters['search'] ?? null;
        $managedIds = $user->getManagedClientIds();

        $query = Client::query()->orderBy('company_name', 'asc');

        if ($user->role !== 'admin') {
            if (empty($managedIds)) {
                return collect();
            }
            $query->whereIn('id', $managedIds);
        } elseif ($clientId) {
            $query->where('id', $clientId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('client_code', 'like', "%{$search}%");
            });
        }

        return $query->get()->map(function (Client $c) {
            $rate = match ($c->billing_model) {
                'markup'                => ($c->markup_percentage ?? 0) . '%',
                'fixed_per_candidate'   => '₹' . number_format((float)($c->fixed_fee_amount ?? 0), 2) . ' / emp',
                'fixed_per_month'       => '₹' . number_format((float)($c->fixed_fee_amount ?? 0), 2) . ' / mo',
                default                 => 'Standard Fee',
            };

            return [
                'client_code'        => $c->client_code,
                'company_name'       => $c->company_name,
                'industry'           => $c->industry ?? 'IT Services',
                'contract_type'      => strtoupper($c->contract_type ?? 'agency'),
                'billing_model'      => ucfirst(str_replace('_', ' ', $c->billing_model ?? 'markup')),
                'commercial_rate'    => $rate,
                'primary_poc_name'   => $c->primary_poc_name ?? '—',
                'primary_poc_email'  => $c->primary_poc_email ?? '—',
                'status'             => ucfirst($c->status ?? 'active'),
            ];
        });
    }

    public function generatePdfBinary(array $filters, User $user): string
    {
        $rows = $this->runForExport($filters, $user);

        $kpis = [
            'total_clients'    => $rows->count(),
            'active_clients'   => $rows->where('status', 'Active')->count(),
            'onboarding_count' => $rows->where('status', 'Onboarding')->count(),
        ];

        $data = [
            'rows'        => $rows,
            'kpis'        => $kpis,
            'userRole'    => $user->role,
            'generatedAt' => Carbon::now()->format('d M Y H:i:s'),
        ];

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = Pdf::loadView('pdf.reports.client_master', $data)
                ->setPaper('a4', 'landscape')
                ->setOption('isRemoteEnabled', true);

            return $pdf->output();
        }

        return view('pdf.reports.client_master', $data)->render();
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
