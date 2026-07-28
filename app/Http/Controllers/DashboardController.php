<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Employee;
use App\Models\Client;
use App\Models\SalaryRevision;
use App\Models\BankChangeRequest;
use App\Models\EmployeeAttendanceOverride;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\LivePunch;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Employee Metrics
        $totalActiveEmployees = Employee::where('status', 'active')->count();
        $totalOnboarding = Employee::where('status', 'onboarding')->count();
        $recentEmployees = Employee::with('client:id,company_name')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get(['id', 'employee_code', 'full_name', 'client_id', 'designation', 'status', 'date_of_joining', 'created_at']);

        // 2. Client Metrics
        $totalClients = Client::where('status', 'active')->count();
        $topClients = Client::where('status', 'active')
            ->withCount(['employees' => function($q) {
                $q->where('status', 'active');
            }])
            ->orderBy('employees_count', 'desc')
            ->take(5)
            ->get(['id', 'company_name', 'client_code', 'contract_type', 'status']);

        // 3. Financial Metrics (Monthly CTC Total across Active Employees)
        $monthlyCtcTotal = Employee::where('status', 'active')
            ->selectRaw('SUM(COALESCE(basic_pay,0) + COALESCE(hra,0) + COALESCE(conveyance,0) + COALESCE(da,0) + COALESCE(medical_allowance,0) + COALESCE(special_allowance,0) + COALESCE(other_additions,0)) as total_ctc')
            ->value('total_ctc') ?: 0;

        $monthlyNetTakeHomeTotal = round($monthlyCtcTotal * 0.85, 2);

        // 4. Pending Approval Queues
        $pendingSalaryRevisions = SalaryRevision::where('status', 'pending_approval')->count();
        $pendingBankRequests = BankChangeRequest::where('status', 'pending')->count();
        $pendingDaySwaps = EmployeeAttendanceOverride::where('attendance_day_type', 'work_day')
            ->whereNotNull('swap_target_date')
            ->where('status', 'pending')
            ->count();
        
        $pendingLeaves = 0;
        if (class_exists(LeaveRequest::class)) {
            $pendingLeaves = LeaveRequest::where('status', 'pending')->count();
        }

        $totalPendingAlerts = $pendingSalaryRevisions + $pendingBankRequests + $pendingDaySwaps + $pendingLeaves;

        // 5. Today's Live Attendance Snapshot
        $todayStr = Carbon::today()->toDateString();
        $punchedInCount = 0;
        if (class_exists(LivePunch::class)) {
            $punchedInCount = LivePunch::whereDate('punch_time', $todayStr)->distinct('employee_id')->count('employee_id');
        }

        $notPunchedCount = max(0, $totalActiveEmployees - $punchedInCount);

        // 6. Recent Pending Salary Revisions List
        $recentRevisions = SalaryRevision::with('employee:id,full_name,employee_code,designation')
            ->where('status', 'pending_approval')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 7. Recent Payroll Runs
        $recentPayrollRuns = [];
        if (class_exists(PayrollRun::class)) {
            $recentPayrollRuns = PayrollRun::with('client:id,company_name')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();
        }

        return Inertia::render('Dashboard/Dashboard', [
            'metrics' => [
                'totalActiveEmployees' => $totalActiveEmployees,
                'totalOnboarding' => $totalOnboarding,
                'totalClients' => $totalClients,
                'monthlyCtcTotal' => (float)$monthlyCtcTotal,
                'monthlyNetTakeHomeTotal' => (float)$monthlyNetTakeHomeTotal,
                'totalPendingAlerts' => $totalPendingAlerts,
                'pendingSalaryRevisions' => $pendingSalaryRevisions,
                'pendingBankRequests' => $pendingBankRequests,
                'pendingDaySwaps' => $pendingDaySwaps,
                'pendingLeaves' => $pendingLeaves,
            ],
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
        ]);
    }
}
