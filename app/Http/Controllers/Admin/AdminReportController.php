<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\Reports\BaseReportService;
use App\Services\Reports\PayrollReportService;
use App\Services\Reports\InvoiceReportService;
use App\Services\Reports\StatutoryReportService;
use App\Services\Reports\EmployeeMasterReportService;
use App\Services\Reports\AttendanceLopReportService;
use App\Services\Reports\LoanStatementReportService;
use App\Services\Reports\MarginProfitabilityReportService;
use App\Services\Reports\FnfReportService;
use App\Services\Reports\AgingReceivablesReportService;
use App\Services\Reports\GstTaxReportService;
use App\Services\Reports\HeadcountMovementReportService;
use App\Services\Reports\ComplianceCalendarReportService;
use App\Services\Reports\AuditLogReportService;
use App\Services\Reports\ClientMasterReportService;
use App\Services\Reports\StatutoryProfileReportService;
use App\Services\Reports\SalaryRevisionReportService;
use App\Services\Reports\PayrollCycleStatusReportService;
use App\Services\Reports\ManagerAccessMatrixReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Unified Controller for Reports Module under /admin/reports (Reports #1 to #18).
 */
class AdminReportController extends Controller
{
    public function __construct(
        protected PayrollReportService $payrollReportService,
        protected InvoiceReportService $invoiceReportService,
        protected StatutoryReportService $statutoryReportService,
        protected EmployeeMasterReportService $employeeMasterReportService,
        protected AttendanceLopReportService $attendanceLopReportService,
        protected LoanStatementReportService $loanStatementReportService,
        protected MarginProfitabilityReportService $marginProfitabilityReportService,
        protected FnfReportService $fnfReportService,
        protected AgingReceivablesReportService $agingReceivablesReportService,
        protected GstTaxReportService $gstTaxReportService,
        protected HeadcountMovementReportService $headcountMovementReportService,
        protected ComplianceCalendarReportService $complianceCalendarReportService,
        protected AuditLogReportService $auditLogReportService,
        protected ClientMasterReportService $clientMasterReportService,
        protected StatutoryProfileReportService $statutoryProfileReportService,
        protected SalaryRevisionReportService $salaryRevisionReportService,
        protected PayrollCycleStatusReportService $payrollCycleStatusReportService,
        protected ManagerAccessMatrixReportService $managerAccessMatrixReportService
    ) {}

    /**
     * Display Report Catalog index page.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $catalog = [
            [
                'category' => 'Payroll & Compensation',
                'reports' => [
                    [
                        'key' => 'payroll_register',
                        'title' => 'Monthly Payroll Register & Reconciliation',
                        'description' => 'Month-wise employee earnings, deductions, employer statutory cost, and total pass-through CTC.',
                        'badge' => 'Core Payroll',
                        'available' => true,
                    ],
                    [
                        'key' => 'employee_master',
                        'title' => 'Employee Master Directory & CTC Breakdown',
                        'description' => 'Employee master details, designation, joining date, monthly CTC, and PII-masked bank/PAN.',
                        'badge' => 'Directory',
                        'available' => true,
                    ],
                    [
                        'key' => 'salary_revision_history',
                        'title' => 'Salary Revision & Promotion History Audit',
                        'description' => 'Historical salary increments, designation changes, promotion records, and percentage increases.',
                        'badge' => 'Appraisals',
                        'available' => true,
                    ],
                    [
                        'key' => 'fnf_register',
                        'title' => 'Full & Final Settlement (FnF) Audit Register',
                        'description' => 'Exit settlements, gratuity, leave encashment, notice pay/recovery, and net disbursement.',
                        'badge' => 'Exit HR',
                        'available' => true,
                    ],
                    [
                        'key' => 'headcount_movement',
                        'title' => 'New Joiners & Exits Headcount Movement',
                        'description' => 'Employee joining and exit dates, movement type, current status, and PII-masked bank details.',
                        'badge' => 'HR Movement',
                        'available' => true,
                    ],
                    [
                        'key' => 'payroll_cycle_status',
                        'title' => 'Operational Payroll Cycle Status Dashboard',
                        'description' => 'Real-time status of client monthly payroll runs (Draft, Processing, Approved, Locked).',
                        'badge' => 'Operations',
                        'available' => true,
                    ],
                ]
            ],
            [
                'category' => 'Client Portfolio',
                'reports' => [
                    [
                        'key' => 'client_master',
                        'title' => 'Client Master Directory & Commercial Terms',
                        'description' => 'Client portfolio directory, contract types, billing models (Fixed/Markup), and commercial terms.',
                        'badge' => 'Portfolio',
                        'available' => true,
                    ],
                ]
            ],
            [
                'category' => 'Statutory Compliance',
                'reports' => [
                    [
                        'key' => 'statutory_summary',
                        'title' => 'Statutory Deduction & Contribution Register',
                        'description' => 'Client-wise monthly PF, ESI, PT, LWF, and TDS liability breakdown.',
                        'badge' => 'Compliance',
                        'available' => true,
                    ],
                    [
                        'key' => 'statutory_profile',
                        'title' => 'Employee Statutory Profile & Exemption Audit',
                        'description' => 'Per-employee PF, ESI, PT, LWF, and EPS coverage status with UAN and ESI numbers.',
                        'badge' => 'Statutory Profile',
                        'available' => true,
                    ],
                    [
                        'key' => 'compliance_calendar',
                        'title' => 'Statutory Compliance Filing Status & Calendar Audit',
                        'description' => 'PF, ESI, PT, and TDS filing due dates vs actual filing status and timestamps.',
                        'badge' => 'Filing Audit',
                        'available' => true,
                    ],
                ]
            ],
            [
                'category' => 'Attendance & Leave',
                'reports' => [
                    [
                        'key' => 'attendance_lop',
                        'title' => 'Attendance & LOP Audit Summary',
                        'description' => 'Employee-wise paid days, loss of pay (LOP) days, and attendance source log.',
                        'badge' => 'Attendance',
                        'available' => true,
                    ],
                ]
            ],
            [
                'category' => 'Loans & Advances',
                'reports' => [
                    [
                        'key' => 'loan_statement',
                        'title' => 'Employee Loan & Advance Recovery Statement',
                        'description' => 'Principal loan amounts, monthly EMI recovery, total repaid, and outstanding balances.',
                        'badge' => 'Loans',
                        'available' => true,
                    ],
                ]
            ],
            [
                'category' => 'Billing & Invoicing',
                'reports' => [
                    [
                        'key' => 'invoice_revenue',
                        'title' => 'Invoice & Margin Summary Report',
                        'description' => 'Pass-through gross, statutory costs, agency fee margins, and payment status.',
                        'badge' => 'Invoicing',
                        'available' => true,
                    ],
                    [
                        'key' => 'aging_receivables',
                        'title' => 'Aging Receivables & Outstanding Collections',
                        'description' => 'Bucketed overdue invoices (0-30, 31-60, 61-90, 90+ days) and collection status.',
                        'badge' => 'Collections',
                        'available' => true,
                    ],
                    [
                        'key' => 'margin_profitability',
                        'title' => 'Margin & Agency Profitability Report',
                        'description' => 'Per-client monthly true agency profit margin and profitability analysis (Admin Only).',
                        'badge' => 'Admin Only',
                        'available' => ($user->role === 'admin'),
                        'admin_only' => true,
                    ],
                    [
                        'key' => 'gst_tax_summary',
                        'title' => 'Monthly GST Filing & Tax Summary Report',
                        'description' => 'CGST, SGST, IGST, and total GST liability breakdown for monthly GSTR-1 audit (Admin Only).',
                        'badge' => 'Admin Only',
                        'available' => ($user->role === 'admin'),
                        'admin_only' => true,
                    ],
                ]
            ],
            [
                'category' => 'System & Security Audit',
                'reports' => [
                    [
                        'key' => 'audit_log_report',
                        'title' => 'User Activity & System Audit Log Report',
                        'description' => 'User actions, login timestamps, resource updates, and IP address audit trail (Admin Only).',
                        'badge' => 'Admin Only',
                        'available' => ($user->role === 'admin'),
                        'admin_only' => true,
                    ],
                    [
                        'key' => 'manager_access_matrix',
                        'title' => 'Manager Client Access & Permission Matrix',
                        'description' => 'Account Manager directory, account status, and assigned client portfolio matrix (Admin Only).',
                        'badge' => 'Admin Only',
                        'available' => ($user->role === 'admin'),
                        'admin_only' => true,
                    ],
                ]
            ],
        ];

        return Inertia::render('Admin/Reports/Index', [
            'catalog' => $catalog,
        ]);
    }

    /**
     * Interactive Report Viewer (Show).
     */
    public function show(Request $request, string $reportKey = 'payroll_register')
    {
        $user = $request->user();

        // Enforce Admin Gating for Admin-Only Reports
        if (in_array($reportKey, ['margin_profitability', 'gst_tax_summary', 'audit_log_report', 'manager_access_matrix']) && $user->role !== 'admin') {
            abort(403, "Access to '{$reportKey}' is restricted to Administrator role.");
        }

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->client_id
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);

        if ($selectedClientId === 'all' || $selectedClientId === '') {
            $selectedClientId = null;
        }

        $filters = array_merge(
            $request->only(['month', 'from', 'to', 'search', 'status', 'page', 'per_page']),
            ['client_id' => $selectedClientId ? (string)$selectedClientId : '']
        );

        // Resolve clients dropdown for filter (Scoped for Manager)
        $managedIds = $user->getManagedClientIds();
        $clientsQuery = Client::where('status', 'active')->select('id', 'company_name', 'client_code')->orderBy('company_name');
        if ($user->role === 'manager') {
            $clientsQuery->whereIn('id', $managedIds);
        }
        $clients = $clientsQuery->get();

        // Get report data pipeline
        $service = $this->getServiceForReport($reportKey);
        if (!$service) {
            abort(404, "Report '{$reportKey}' not found.");
        }

        $reportData = $service->run($filters, $user);
        $columns    = $service->getColumns();
        $allRows    = $service->runForExport($filters, $user);

        $reportTitles = [
            'payroll_register'       => 'Monthly Payroll Register & Reconciliation',
            'statutory_summary'      => 'Statutory Deduction & Contribution Register',
            'employee_master'        => 'Employee Master Directory & CTC Breakdown',
            'attendance_lop'         => 'Attendance & LOP Audit Summary',
            'loan_statement'         => 'Employee Loan & Advance Recovery Statement',
            'invoice_revenue'        => 'Invoice & Margin Summary Report',
            'margin_profitability'   => 'Margin & Agency Profitability Report',
            'fnf_register'           => 'Full & Final Settlement (FnF) Audit Register',
            'aging_receivables'      => 'Aging Receivables & Outstanding Collections',
            'gst_tax_summary'        => 'Monthly GST Filing & Tax Summary Report',
            'headcount_movement'     => 'New Joiners & Exits Headcount Movement',
            'compliance_calendar'    => 'Statutory Compliance Filing Status & Calendar Audit',
            'audit_log_report'       => 'User Activity & System Audit Log Report',
            'client_master'          => 'Client Master Directory & Commercial Terms',
            'statutory_profile'      => 'Employee Statutory Profile & Exemption Audit',
            'salary_revision_history'=> 'Salary Revision & Promotion History Audit',
            'payroll_cycle_status'   => 'Operational Payroll Cycle Status Dashboard',
            'manager_access_matrix'  => 'Manager Client Access & Permission Matrix',
        ];

        $reportTitle = $reportTitles[$reportKey] ?? 'Executive Report';

        $kpis = match ($reportKey) {
            'client_master' => [
                'total_rows'       => $allRows->count(),
                'active_count'     => $allRows->where('status', 'Active')->count(),
                'onboarding_count' => $allRows->where('status', 'Onboarding')->count(),
            ],
            'statutory_profile' => [
                'total_rows'  => $allRows->count(),
                'pf_covered'  => $allRows->where('pf_status', 'Covered')->count(),
                'esi_covered' => $allRows->where('esi_status', 'Covered')->count(),
                'pt_covered'  => $allRows->where('pt_status', 'Covered')->count(),
            ],
            'salary_revision_history' => [
                'total_rows'     => $allRows->count(),
                'approved_count'  => $allRows->where('status', 'Approved')->count(),
                'pending_count'   => $allRows->where('status', 'Pending')->count(),
            ],
            'payroll_cycle_status' => [
                'total_rows'   => $allRows->count(),
                'locked_runs'  => $allRows->where('cycle_status', 'LOCKED')->count(),
                'approved_runs'=> $allRows->where('cycle_status', 'APPROVED')->count(),
            ],
            'manager_access_matrix' => [
                'total_rows'       => $allRows->count(),
                'active_managers'  => $allRows->where('status', 'Active')->count(),
                'assigned_count'   => $allRows->where('assigned_clients_count', '>', 0)->count(),
            ],
            'fnf_register' => [
                'total_rows'         => $allRows->count(),
                'total_gratuity'     => round($allRows->sum('gratuity_amount'), 2),
                'total_leave_enc'    => round($allRows->sum('leave_encashment_amount'), 2),
                'total_net_disbursed'=> round($allRows->sum('net_settlement_amount'), 2),
            ],
            'aging_receivables' => [
                'total_rows'        => $allRows->count(),
                'total_outstanding' => round($allRows->sum('grand_total'), 2),
                'total_overdue'     => round($allRows->where('days_overdue', '>', 0)->sum('grand_total'), 2),
                'severe_overdue'    => round($allRows->where('aging_bucket', '90+ Days (Severe)')->sum('grand_total'), 2),
            ],
            'gst_tax_summary' => [
                'total_rows'     => $allRows->count(),
                'total_taxable'  => round($allRows->sum('taxable_agency_fee'), 2),
                'total_cgst'     => round($allRows->sum('cgst_amount'), 2),
                'total_sgst'     => round($allRows->sum('sgst_amount'), 2),
                'total_igst'     => round($allRows->sum('igst_amount'), 2),
                'total_gst'      => round($allRows->sum('total_gst_amount'), 2),
            ],
            'headcount_movement' => [
                'total_rows'     => $allRows->count(),
                'total_joiners'  => $allRows->where('event_type', 'New Joiner')->count(),
                'total_exits'    => $allRows->where('event_type', 'Exit / Separation')->count(),
                'net_movement'   => $allRows->where('event_type', 'New Joiner')->count() - $allRows->where('event_type', 'Exit / Separation')->count(),
            ],
            'compliance_calendar' => [
                'total_rows'     => $allRows->count(),
                'filed_count'    => $allRows->where('status', 'Filed')->count(),
                'pending_count'  => $allRows->where('status', 'Pending')->count(),
            ],
            'audit_log_report' => [
                'total_rows'     => $allRows->count(),
                'unique_users'   => $allRows->pluck('user_email')->unique()->count(),
                'action_types'   => $allRows->pluck('action')->unique()->count(),
            ],
            'margin_profitability' => [
                'total_rows'        => $allRows->count(),
                'total_invoiced'    => round($allRows->sum('invoiced_excl_gst'), 2),
                'total_gross'       => round($allRows->sum('gross_earnings'), 2),
                'total_er_stat'     => round($allRows->sum('employer_statutory_cost'), 2),
                'total_margin'      => round($allRows->sum('true_agency_margin'), 2),
                'overall_margin_pct'=> ($allRows->sum('invoiced_excl_gst') > 0) ? round(($allRows->sum('true_agency_margin') / $allRows->sum('invoiced_excl_gst')) * 100, 2) . '%' : '0.00%',
            ],
            'invoice_revenue' => [
                'total_rows'        => $allRows->count(),
                'total_invoiced'    => round($allRows->sum('grand_total'), 2),
                'total_collected'   => round($allRows->where('status', 'Paid')->sum('grand_total'), 2),
                'total_outstanding' => round($allRows->whereIn('status', ['Raised', 'Draft', 'Finalized', 'Overdue', 'Sent'])->sum('grand_total'), 2),
                'total_overdue'     => round($allRows->where('status', 'Overdue')->sum('grand_total'), 2),
                'total_passthrough' => round($allRows->sum('gross_salary_passthrough'), 2),
            ],
            'statutory_summary' => [
                'total_rows'       => $allRows->count(),
                'total_emp_stat'   => round($allRows->sum('employee_pf') + $allRows->sum('employee_esi') + $allRows->sum('professional_tax') + $allRows->sum('lwf_deduction') + $allRows->sum('tds_deduction'), 2),
                'total_er_stat'    => round($allRows->sum('employer_pf') + $allRows->sum('employer_esi') + $allRows->sum('employer_lwf'), 2),
                'total_liability'  => round($allRows->sum('total_statutory_liability'), 2),
            ],
            'employee_master' => [
                'total_rows'      => $allRows->count(),
                'active_count'    => $allRows->where('status', 'Active')->count(),
                'total_gross'     => round($allRows->sum('gross_monthly_salary'), 2),
                'total_ctc'       => round($allRows->sum('ctc_monthly'), 2),
            ],
            'attendance_lop' => [
                'total_rows'         => $allRows->count(),
                'total_paid_days'    => round($allRows->sum('paid_days'), 1),
                'total_lop_days'     => round($allRows->sum('lop_days'), 1),
                'total_lop_deduction'=> round($allRows->sum('lop_deduction'), 2),
            ],
            'loan_statement' => [
                'total_rows'        => $allRows->count(),
                'total_principal'   => round($allRows->sum('principal_amount'), 2),
                'total_repaid'      => round($allRows->sum('total_repaid'), 2),
                'total_outstanding' => round($allRows->sum('remaining_balance'), 2),
            ],
            default => [
                'total_rows'      => $allRows->count(),
                'total_gross'     => round($allRows->sum('gross_total'), 2),
                'total_net'       => round($allRows->sum('net_pay'), 2),
                'total_ctc'       => round($allRows->sum('total_ctc'), 2),
            ],
        };

        return Inertia::render('Admin/Reports/Show', [
            'reportKey'  => $reportKey,
            'reportTitle'=> $reportTitle,
            'columns'    => $columns,
            'reportData' => $reportData,
            'kpis'       => $kpis,
            'clients'    => $clients,
            'filters'    => $filters,
            'userRole'   => $user->role,
        ]);
    }

    /**
     * Stream CSV Export for Report.
     */
    public function export(Request $request, string $reportKey = 'payroll_register')
    {
        $user = $request->user();

        if (in_array($reportKey, ['margin_profitability', 'gst_tax_summary', 'audit_log_report', 'manager_access_matrix']) && $user->role !== 'admin') {
            abort(403, "Access to '{$reportKey}' is restricted to Administrator role.");
        }

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->client_id
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);

        if ($selectedClientId === 'all' || $selectedClientId === '') {
            $selectedClientId = null;
        }

        $filters = array_merge(
            $request->only(['month', 'from', 'to', 'search', 'status']),
            ['client_id' => $selectedClientId ? (string)$selectedClientId : '']
        );

        $service = $this->getServiceForReport($reportKey);
        if (!$service) {
            abort(404, "Report '{$reportKey}' not found.");
        }

        $rows     = $service->runForExport($filters, $user);
        $filename = ucfirst($reportKey) . "_" . date('Y_m_d_His');

        return $service->csvDownloadResponse($rows, $filename);
    }

    /**
     * Stream PDF Export for Report.
     */
    public function pdf(Request $request, string $reportKey = 'payroll_register')
    {
        $user = $request->user();

        if (in_array($reportKey, ['margin_profitability', 'gst_tax_summary', 'audit_log_report', 'manager_access_matrix']) && $user->role !== 'admin') {
            abort(403, "Access to '{$reportKey}' is restricted to Administrator role.");
        }

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->client_id
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);

        if ($selectedClientId === 'all' || $selectedClientId === '') {
            $selectedClientId = null;
        }

        $filters = array_merge(
            $request->only(['month', 'from', 'to', 'search', 'status']),
            ['client_id' => $selectedClientId ? (string)$selectedClientId : '']
        );

        $service = $this->getServiceForReport($reportKey);
        if (!$service) {
            abort(404, "Report '{$reportKey}' not found.");
        }

        $filename = ucfirst($reportKey) . "_" . date('Y_m_d_His');
        return $service->pdfDownloadResponse($filters, $user, $filename);
    }

    private function getServiceForReport(string $key): ?BaseReportService
    {
        return match ($key) {
            'payroll_register'        => $this->payrollReportService->forReport('payroll_register'),
            'invoice_revenue'         => $this->invoiceReportService,
            'statutory_summary'       => $this->statutoryReportService,
            'employee_master'         => $this->employeeMasterReportService,
            'attendance_lop'          => $this->attendanceLopReportService,
            'loan_statement'          => $this->loanStatementReportService,
            'margin_profitability'    => $this->marginProfitabilityReportService,
            'fnf_register'           => $this->fnfReportService,
            'aging_receivables'      => $this->agingReceivablesReportService,
            'gst_tax_summary'        => $this->gstTaxReportService,
            'headcount_movement'     => $this->headcountMovementReportService,
            'compliance_calendar'    => $this->complianceCalendarReportService,
            'audit_log_report'       => $this->auditLogReportService,
            'client_master'          => $this->clientMasterReportService,
            'statutory_profile'      => $this->statutoryProfileReportService,
            'salary_revision_history'=> $this->salaryRevisionReportService,
            'payroll_cycle_status'   => $this->payrollCycleStatusReportService,
            'manager_access_matrix'  => $this->managerAccessMatrixReportService,
            default                   => null,
        };
    }
}
