<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Models\PayrollRunItem;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Specialized Service for Payroll & Compensation Module Reports.
 */
class PayrollReportService extends BaseReportService
{
    private string $activeReport = 'payroll_register';

    public function getReportKey(): string
    {
        return $this->activeReport;
    }

    public function forReport(string $reportKey): static
    {
        $this->activeReport = $reportKey;
        return $this;
    }

    public function getColumns(): array
    {
        return match ($this->activeReport) {
            'payroll_register' => [
                'payroll_month'            => 'Month',
                'client_name'              => 'Client Name',
                'employee_code'            => 'Emp Code',
                'employee_name'            => 'Employee Name',
                'bank_account_number'      => 'Bank A/C No',
                'pan_number'               => 'PAN Number',
                'paid_days'                => 'Paid Days',
                'lop_days'                 => 'LOP Days',
                'basic_pay'                => 'Basic Pay (₹)',
                'hra'                      => 'HRA (₹)',
                'gross_total'              => 'Gross Total (₹)',
                'employee_pf'              => 'Emp PF (₹)',
                'employee_vpf'             => 'Emp VPF (₹)',
                'employee_esi'             => 'Emp ESI (₹)',
                'professional_tax'         => 'PT (₹)',
                'pt_shortfall_recovery'    => 'PT Shortfall (₹)',
                'lwf_deduction'            => 'LWF (₹)',
                'tds_deduction'            => 'TDS (₹)',
                'loan_emi_deduction'       => 'Loan EMI (₹)',
                'net_pay'                  => 'Net Pay (₹)',
                'employer_pf'              => 'Employer PF (₹)',
                'employer_esi'             => 'Employer ESI (₹)',
                'employer_lwf'             => 'Employer LWF (₹)',
                'total_employer_statutory' => 'Total Er Statutory (₹)',
                'total_ctc'                => 'Total CTC / Cost (₹)',
            ],
            default => [],
        };
    }

    public function getData(array $filters, User $user): Collection
    {
        return match ($this->activeReport) {
            'payroll_register' => $this->getPayrollRegister($filters, $user),
            default            => collect(),
        };
    }

    /**
     * Report #1: Monthly Payroll Register & Reconciliation
     */
    public function getPayrollRegister(array $filters, User $user): Collection
    {
        $this->forReport('payroll_register');

        $clientId   = $this->parseId($filters, 'client_id');
        $month      = $this->parseMonth($filters);
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

        $items = $query->get();

        // Sort by month desc, employee name asc
        $items = $items->sortBy([
            fn($a, $b) => strcmp($b->payrollRun->payroll_month ?? '', $a->payrollRun->payroll_month ?? ''),
            fn($a, $b) => strcmp($a->employee->full_name ?? '', $b->employee->full_name ?? ''),
        ]);

        return $items->map(function ($i) {
            $emp  = $i->employee;
            $run  = $i->payrollRun;
            $client = $run?->client;

            $erPf  = (float) $i->employer_pf;
            $erEsi = (float) $i->employer_esi;
            $erLwf = (float) $i->employer_lwf;
            $gross = (float) $i->gross_total;

            $totalErStatutory = round($erPf + $erEsi + $erLwf, 2);
            $totalCtc        = round($gross + $totalErStatutory, 2);

            return [
                'payroll_month'            => $run ? Carbon::parse($run->payroll_month)->format('M Y') : '',
                'client_name'              => $client->company_name ?? 'Unknown',
                'employee_code'            => $emp->employee_code ?? '',
                'employee_name'            => $emp->full_name ?? 'Unknown',
                'bank_account_number'      => $emp->bank_account_number, // Decrypted by Eloquent, Sanitized by BaseReportService
                'pan_number'               => $emp->pan_number,          // Decrypted by Eloquent, Sanitized by BaseReportService
                'paid_days'                => (float) $i->paid_days,
                'lop_days'                 => (float) $i->lop_days,
                'basic_pay'                => (float) $i->basic_pay,
                'hra'                      => (float) $i->hra,
                'gross_total'              => $gross,
                'employee_pf'              => (float) $i->employee_pf,
                'employee_vpf'             => (float) ($i->employee_vpf ?? 0.00),
                'employee_esi'             => (float) $i->employee_esi,
                'professional_tax'         => (float) $i->professional_tax,
                'pt_shortfall_recovery'    => (float) ($i->pt_shortfall_recovery ?? 0),
                'lwf_deduction'            => (float) $i->lwf_deduction,
                'tds_deduction'            => (float) $i->tds_deduction,
                'loan_emi_deduction'       => (float) $i->loan_emi_deduction,
                'net_pay'                  => (float) $i->net_pay,
                'employer_pf'              => $erPf,
                'employer_esi'             => $erEsi,
                'employer_lwf'             => $erLwf,
                'total_employer_statutory' => $totalErStatutory,
                'total_ctc'                => $totalCtc,
            ];
        })->values();
    }
}
