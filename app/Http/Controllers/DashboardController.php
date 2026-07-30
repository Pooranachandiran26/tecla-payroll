<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Employee;
use App\Models\Client;
use App\Models\SalaryRevision;
use App\Models\BankChangeRequest;
use App\Models\EmployeeAttendanceOverride;
use App\Models\EmployeeLoan;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\AttendanceRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $todayStr = Carbon::today()->toDateString();
        $selectedClientId = $request->input('client_id');

        $managedClientIds = $user->getManagedClientIds();

        // All Active Clients list for filter dropdown (Scoped for manager)
        $allClientsQuery = Client::where('status', 'active');
        if ($user->role === 'manager') {
            $allClientsQuery->whereIn('id', $managedClientIds);
        }
        $allClientsList = $allClientsQuery->select('id', 'company_name', 'client_code', 'contract_type')
            ->orderBy('company_name')
            ->get();

        $selectedClient = null;
        if ($selectedClientId) {
            if ($user->role === 'manager' && !in_array((int)$selectedClientId, $managedClientIds)) {
                abort(403, 'Unauthorized access to this client partner.');
            }
            $selectedClient = Client::withCount(['employees' => function($q) {
                $q->where('status', 'active');
            }])->find($selectedClientId);
        }

        // Scoped Builders
        $empQuery = Employee::query();
        $revQuery = SalaryRevision::query();
        $bankQuery = BankChangeRequest::query();
        $swapQuery = EmployeeAttendanceOverride::query();
        $punchQuery = class_exists(AttendanceRecord::class) ? AttendanceRecord::query() : null;

        // Apply Manager Global Scoping first if no single client is explicitly selected
        if ($user->role === 'manager') {
            $empQuery->whereIn('client_id', $managedClientIds);
            $revQuery->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
            $bankQuery->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
            $swapQuery->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
            if ($punchQuery) {
                $punchQuery->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
            }
        }

        if ($selectedClientId) {
            $empQuery->where('client_id', $selectedClientId);
            $revQuery->whereHas('employee', fn($q) => $q->where('client_id', $selectedClientId));
            $bankQuery->whereHas('employee', fn($q) => $q->where('client_id', $selectedClientId));
            $swapQuery->whereHas('employee', fn($q) => $q->where('client_id', $selectedClientId));
            if ($punchQuery) {
                $punchQuery->whereHas('employee', fn($q) => $q->where('client_id', $selectedClientId));
            }
        }

        // 1. Employee Module Analytics (Global or Client-specific)
        $totalActiveEmployees = (clone $empQuery)->where('status', 'active')->count();
        $totalOnboarding = (clone $empQuery)->where('status', 'onboarding')->count();
        $employeesUnderProbation = (clone $empQuery)->where('status', 'active')
            ->whereNotNull('probation_end_date')
            ->where('probation_end_date', '>', $todayStr)
            ->count();

        $maleCount = (clone $empQuery)->where('status', 'active')->where(DB::raw('LOWER(gender)'), 'male')->count();
        $femaleCount = (clone $empQuery)->where('status', 'active')->where(DB::raw('LOWER(gender)'), 'female')->count();

        $eorStaffCount = (clone $empQuery)->where('status', 'active')->where('employment_model', 'eor')->count();
        $agencyStaffCount = (clone $empQuery)->where('status', 'active')->where('employment_model', 'agency_contract')->count();

        $newTaxRegimeCount = (clone $empQuery)->where('status', 'active')->where('tds_regime', 'new')->count();
        $oldTaxRegimeCount = (clone $empQuery)->where('status', 'active')->where('tds_regime', 'old')->count();

        // 2. Top Designations, Departments & Document Verification Rate
        $topDesignations = (clone $empQuery)->where('status', 'active')
            ->select('designation', DB::raw('count(*) as count'))
            ->whereNotNull('designation')
            ->groupBy('designation')
            ->orderBy('count', 'desc')
            ->take(4)
            ->get();

        $topDepartments = [];
        if (Schema::hasColumn('employees', 'department')) {
            $topDepartments = (clone $empQuery)->where('status', 'active')
                ->select('department', DB::raw('count(*) as count'))
                ->whereNotNull('department')
                ->where('department', '!=', '')
                ->groupBy('department')
                ->orderBy('count', 'desc')
                ->take(4)
                ->get();
        }

        $workLocations = [];
        if (Schema::hasColumn('employees', 'work_location')) {
            $workLocations = (clone $empQuery)->where('status', 'active')
                ->select('work_location', DB::raw('count(*) as count'))
                ->whereNotNull('work_location')
                ->where('work_location', '!=', '')
                ->groupBy('work_location')
                ->orderBy('count', 'desc')
                ->take(4)
                ->get();
        }

        $verifiedBankCount = (clone $empQuery)->where('status', 'active')->whereNotNull('bank_account_number')->count();
        $verifiedPanCount = (clone $empQuery)->where('status', 'active')->whereNotNull('pan_number')->count();
        $verifiedAadhaarCount = (clone $empQuery)->where('status', 'active')->whereNotNull('aadhaar_number')->count();
        $bankVerificationPct = $totalActiveEmployees > 0 ? round(($verifiedBankCount / $totalActiveEmployees) * 100) : 0;

        $pfEnrolledCount = (clone $empQuery)->where('status', 'active')->where('pf_applicable', true)->count();
        $esiEnrolledCount = (clone $empQuery)->where('status', 'active')->where('esi_applicable', true)->count();
        $ptEnrolledCount = (clone $empQuery)->where('status', 'active')->where('pt_applicable', true)->count();

        $recentEmployees = (clone $empQuery)->with('client:id,company_name')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get(['id', 'employee_code', 'full_name', 'client_id', 'designation', 'status', 'date_of_joining', 'probation_end_date', 'created_at']);

        // 3. Client Module Analytics (Scoped for Manager)
        $baseClientsQuery = Client::where('status', 'active');
        if ($user->role === 'manager') {
            $baseClientsQuery->whereIn('id', $managedClientIds);
        }

        $totalClients = (clone $baseClientsQuery)->count();
        $eorClientsCount = (clone $baseClientsQuery)->where('contract_type', 'eor')->count();
        $agencyClientsCount = (clone $baseClientsQuery)->where('contract_type', 'agency')->count();

        $topClients = (clone $baseClientsQuery)
            ->withCount(['employees' => function($q) {
                $q->where('status', 'active');
            }])
            ->orderBy('employees_count', 'desc')
            ->take(5)
            ->get(['id', 'company_name', 'client_code', 'contract_type', 'status', 'sla_tier']);

        // 4. Compensation & Financial Analytics
        $monthlyCtcTotal = (clone $empQuery)->where('status', 'active')
            ->selectRaw('SUM(COALESCE(basic_pay,0) + COALESCE(hra,0) + COALESCE(conveyance,0) + COALESCE(da,0) + COALESCE(medical_allowance,0) + COALESCE(special_allowance,0) + COALESCE(other_additions,0)) as total_ctc')
            ->value('total_ctc') ?: 0;

        $monthlyNetTakeHomeTotal = round($monthlyCtcTotal * 0.85, 2);

        $totalApprovedPromotions = (clone $revQuery)->where('status', 'approved')->where('is_promotion', true)->count();
        $totalApprovedRevisions = (clone $revQuery)->where('status', 'approved')->count();

        // 5. Estimated Employer Statutory Liabilities (DB Agnostic)
        $activeEmpList = (clone $empQuery)->where('status', 'active')->get(['basic_pay', 'hra', 'conveyance', 'da', 'medical_allowance', 'special_allowance', 'other_additions']);
        $estEmployerPfTotal = round($activeEmpList->sum(function($emp) {
            $base = ($emp->basic_pay ?? 0) + ($emp->da ?? 0);
            return min($base, 15000) * 0.13;
        }), 2);
        $estEmployerEsiTotal = round($activeEmpList->sum(function($emp) {
            $gross = ($emp->basic_pay ?? 0) + ($emp->hra ?? 0) + ($emp->conveyance ?? 0) + ($emp->da ?? 0) + ($emp->medical_allowance ?? 0) + ($emp->special_allowance ?? 0) + ($emp->other_additions ?? 0);
            return $gross <= 21000 ? $gross * 0.0325 : 0;
        }), 2);

        // 6. Pending Approval Queues Matrix
        $pendingSalaryRevisions = (clone $revQuery)->where('status', 'pending_approval')->count();
        $pendingBankRequests = (clone $bankQuery)->where('status', 'pending')->count();
        $pendingDaySwaps = (clone $swapQuery)->where('attendance_day_type', 'work_day')
            ->whereNotNull('swap_target_date')
            ->where('status', 'pending')
            ->count();
        
        $pendingLeaves = 0;
        $approvedLeavesThisMonth = 0;
        if (class_exists(LeaveRequest::class)) {
            $leaveQ = LeaveRequest::query();
            if ($user->role === 'manager') {
                $leaveQ->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
            }
            if ($selectedClientId) {
                $leaveQ->whereHas('employee', fn($q) => $q->where('client_id', $selectedClientId));
            }
            $pendingLeaves = (clone $leaveQ)->where('status', 'pending')->count();
            $approvedLeavesThisMonth = (clone $leaveQ)->where('status', 'approved')
                ->whereMonth('created_at', Carbon::now()->month)
                ->count();
        }

        $totalPendingAlerts = $pendingSalaryRevisions + $pendingBankRequests + $pendingDaySwaps + $pendingLeaves;

        // 7. Attendance & Shift Live Snapshot
        $punchedInCount = 0;
        if ($punchQuery && class_exists(AttendanceRecord::class)) {
            $punchedInCount = (clone $punchQuery)->whereDate('attendance_date', $todayStr)->distinct('employee_id')->count('employee_id');
        }
        $notPunchedCount = max(0, $totalActiveEmployees - $punchedInCount);

        // 8. Loans & Advances Module Analytics
        $activeLoansCount = 0;
        $totalLoanPrincipalOutstanding = 0;
        if (class_exists(EmployeeLoan::class)) {
            $loanQ = EmployeeLoan::whereIn('status', ['approved', 'active']);
            if ($user->role === 'manager') {
                $loanQ->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
            }
            if ($selectedClientId) {
                $loanQ->whereHas('employee', fn($q) => $q->where('client_id', $selectedClientId));
            }
            $activeLoansCount = (clone $loanQ)->count();
            $totalLoanPrincipalOutstanding = (clone $loanQ)->sum('principal_amount') ?: 0;
        }

        // 9. Recent Pending Salary Revisions List
        $recentRevisions = (clone $revQuery)->with('employee:id,full_name,employee_code,designation')
            ->where('status', 'pending_approval')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 10. Recent Payroll Runs
        $recentPayrollRuns = [];
        if (class_exists(PayrollRun::class)) {
            $pRunQ = PayrollRun::with('client:id,company_name');
            if ($user->role === 'manager') {
                $pRunQ->whereIn('client_id', $managedClientIds);
            }
            if ($selectedClientId) {
                $pRunQ->where('client_id', $selectedClientId);
            }
            $recentPayrollRuns = $pRunQ->orderBy('created_at', 'desc')->take(5)->get();
        }

        return Inertia::render('Dashboard/Dashboard', [
            'selectedClientId' => $selectedClientId ? (int)$selectedClientId : null,
            'selectedClient' => $selectedClient,
            'allClientsList' => $allClientsList,
            'metrics' => [
                'totalActiveEmployees' => $totalActiveEmployees,
                'totalOnboarding' => $totalOnboarding,
                'employeesUnderProbation' => $employeesUnderProbation,
                'maleCount' => $maleCount,
                'femaleCount' => $femaleCount,
                'eorStaffCount' => $eorStaffCount,
                'agencyStaffCount' => $agencyStaffCount,
                'newTaxRegimeCount' => $newTaxRegimeCount,
                'oldTaxRegimeCount' => $oldTaxRegimeCount,
                'totalClients' => $totalClients,
                'eorClientsCount' => $eorClientsCount,
                'agencyClientsCount' => $agencyClientsCount,
                'monthlyCtcTotal' => (float)$monthlyCtcTotal,
                'monthlyNetTakeHomeTotal' => (float)$monthlyNetTakeHomeTotal,
                'totalApprovedPromotions' => $totalApprovedPromotions,
                'totalApprovedRevisions' => $totalApprovedRevisions,
                'estEmployerPfTotal' => (float)$estEmployerPfTotal,
                'estEmployerEsiTotal' => (float)$estEmployerEsiTotal,
                'totalPendingAlerts' => $totalPendingAlerts,
                'pendingSalaryRevisions' => $pendingSalaryRevisions,
                'pendingBankRequests' => $pendingBankRequests,
                'pendingDaySwaps' => $pendingDaySwaps,
                'pendingLeaves' => $pendingLeaves,
                'approvedLeavesThisMonth' => $approvedLeavesThisMonth,
                'activeLoansCount' => $activeLoansCount,
                'totalLoanPrincipalOutstanding' => (float)$totalLoanPrincipalOutstanding,
                'bankVerificationPct' => $bankVerificationPct,
                'verifiedBankCount' => $verifiedBankCount,
                'verifiedPanCount' => $verifiedPanCount,
                'verifiedAadhaarCount' => $verifiedAadhaarCount,
                'pfEnrolledCount' => $pfEnrolledCount,
                'esiEnrolledCount' => $esiEnrolledCount,
                'ptEnrolledCount' => $ptEnrolledCount,
            ],
            'topDesignations' => $topDesignations,
            'topDepartments' => $topDepartments,
            'workLocations' => $workLocations,
            'todayAttendance' => [
                'punchedIn' => $punchedInCount,
                'notPunched' => $notPunchedCount,
                'totalActive' => $totalActiveEmployees,
                'completionPct' => $totalActiveEmployees > 0 ? round(($punchedInCount / $totalActiveEmployees) * 100) : 0,
            ],
            'recentEmployees' => $recentEmployees,
            'topClients' => $topClients,
            'recentRevisions' => $recentRevisions,
            'recentPayrollRuns' => $recentPayrollRuns,
            'currentPeriod' => Carbon::now()->format('F Y'),
            'themeColor' => class_exists(\App\Services\SettingsService::class) ? (\App\Services\SettingsService::get('branding.primary_color', '#082d9b') ?: '#082d9b') : '#082d9b',
        ]);
    }
}
