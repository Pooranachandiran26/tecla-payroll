<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\AttendanceUploadBatch;
use App\Models\ClientAttendanceVerification;
use App\Services\PayrollEligibilityService;
use App\Services\AttendanceResolutionService;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class AttendanceReviewController extends Controller
{
    protected $eligibilityService;
    protected $resolutionService;

    public function __construct(
        PayrollEligibilityService $eligibilityService,
        AttendanceResolutionService $resolutionService
    ) {
        $this->eligibilityService = $eligibilityService;
        $this->resolutionService = $resolutionService;
    }

    /**
     * Display a list of all active clients and their attendance review statuses.
     */
    public function index(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $currentMonthDefault = now()->format('Y-m');
        $targetMonth = $request->query('month', $currentMonthDefault);
        $monthStart = Carbon::parse($targetMonth . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->query('client_id')
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);

        $clientsQuery = Client::where('status', 'active');
        if ($request->user()->role === 'manager') {
            $clientsQuery->whereIn('id', $request->user()->getManagedClientIds());
        }
        if ($selectedClientId && $selectedClientId !== 'all') {
            $clientsQuery->where('id', $selectedClientId);
        }
        $clients = $clientsQuery->orderBy('id', 'desc')->get();
        $rows = [];

        foreach ($clients as $client) {
            $totalActiveCount = Employee::where('client_id', $client->id)
                ->where('status', 'active')
                ->count();

            // 1. Resolve Source State
            $hasUploadBatch = AttendanceUploadBatch::where('client_id', $client->id)
                ->whereBetween('target_month', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->exists();

            $hasAttendanceRecords = AttendanceRecord::whereHas('employee', function ($q) use ($client) {
                    $q->where('client_id', $client->id);
                })
                ->whereBetween('attendance_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->exists();

            if ($hasUploadBatch) {
                $source = 'Spreadsheet Upload';
            } elseif ($hasAttendanceRecords) {
                $source = 'Biometric portal / Punch-in';
            } else {
                $source = 'No Data Yet';
            }

            // 2. Load Point-in-time Verification
            $verification = ClientAttendanceVerification::with('verifier')
                ->where('client_id', $client->id)
                ->whereDate('target_month', $monthStart->toDateString())
                ->first();

            $status = 'unverified';
            $verifiedText = 'Not Verified';
            if ($verification) {
                $status = 'verified';
                $verifierName = $verification->verifier ? $verification->verifier->name : 'System';
                $verifiedTime = $verification->verified_at->diffForHumans();
                $verifiedText = "✓ Verified {$verifiedTime} by {$verifierName}";
            }

            // 3. Last Synced / Updated Info
            $syncText = 'Never';
            if ($hasUploadBatch) {
                $latestBatch = AttendanceUploadBatch::where('client_id', $client->id)
                    ->whereBetween('target_month', [$monthStart->toDateString(), $monthEnd->toDateString()])
                    ->latest()
                    ->first();
                if ($latestBatch) {
                    $syncText = $latestBatch->created_at->format('M d, Y h:i A') . ' (Upload)';
                }
            } elseif ($hasAttendanceRecords) {
                $syncText = 'Real-time Sync';
            }

            $rows[] = [
                'id' => $client->id,
                'client' => $client->company_name,
                'month' => $monthStart->format('F Y'),
                'empCount' => "{$totalActiveCount} Employees",
                'source' => $source,
                'reqApproval' => false, // Always read-only checkbox placeholder
                'status' => $status,
                'verifiedText' => $verifiedText,
                'sync' => $syncText,
            ];
        }

        return Inertia::render('Payroll/AttendanceReview', [
            'initialBatches' => $rows,
            'clients' => $clients->map(fn($c) => ['id' => $c->id, 'company_name' => $c->company_name]),
            'selectedMonth' => $targetMonth,
        ]);
    }

    /**
     * Run pre-payroll log verification check for a single client and month.
     */
    public function verifyLogs(Request $request, $clientId)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        if ($request->user()->role === 'manager' && !$request->user()->isManagerForClient($clientId)) {
            abort(403, 'Unauthorized access to this client partner.');
        }

        $targetMonth = $request->query('month', '2026-07');
        $monthStart = Carbon::parse($targetMonth . '-01')->toDateString();
        $monthEnd = Carbon::parse($targetMonth . '-01')->endOfMonth()->toDateString();

        $client = Client::findOrFail($clientId);
        $employees = Employee::where('client_id', $clientId)
            ->where('status', 'active')
            ->get();

        $totalChecked = $employees->count();
        $exclusions = [];
        $warnings = [];

        // Bulk find employees with missing bank accounts or PAN numbers
        $missingBankEmps = $employees->filter(fn($e) => empty($e->bank_account_number));
        foreach ($missingBankEmps as $emp) {
            $exclusions[] = "{$emp->full_name} ({$emp->employee_code}): Missing bank account number";
        }

        $missingPanEmps = $employees->filter(fn($e) => empty($e->pan_number));
        foreach ($missingPanEmps as $emp) {
            $warnings[] = "{$emp->full_name} ({$emp->employee_code}): Missing PAN number";
        }

        $eligibleCount = max(0, $totalChecked - count($missingBankEmps));

        return response()->json([
            'client_name' => $client->company_name,
            'month_label' => Carbon::parse($targetMonth . '-01')->format('F Y'),
            'total_checked' => $totalChecked,
            'eligible_count' => $eligibleCount,
            'exclusions' => $exclusions,
            'warnings' => $warnings,
        ]);
    }

    /**
     * Record verification status.
     */
    public function saveVerification(Request $request, $clientId)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'month' => 'required|string',
        ]);

        $monthStart = Carbon::parse($request->month . '-01')->toDateString();

        ClientAttendanceVerification::updateOrCreate(
            [
                'client_id' => $clientId,
                'target_month' => $monthStart,
            ],
            [
                'verified_by' => Auth::id(),
                'verified_at' => Carbon::now(),
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Get detailed attendance log preview for client employees in the selected month.
     */
    public function details(Request $request, $clientId)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized');
        }

        $targetMonth = $request->query('month', '2026-07');
        $monthStart = Carbon::parse($targetMonth . '-01')->toDateString();
        $monthEnd = Carbon::parse($targetMonth . '-01')->endOfMonth()->toDateString();

        $client = Client::findOrFail($clientId);
        $employees = Employee::where('client_id', $clientId)
            ->where('status', 'active')
            ->orderBy('id', 'desc')
            ->get();

        // 1. Bulk query attendance records summary for all employees in 1 single GROUP BY query!
        $recordsSummary = \Illuminate\Support\Facades\DB::table('attendance_records')
            ->whereIn('employee_id', $employees->pluck('id'))
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->select(
                'employee_id',
                \Illuminate\Support\Facades\DB::raw("SUM(CASE WHEN status IN ('present', 'half_day') THEN 1 ELSE 0 END) as present_count"),
                \Illuminate\Support\Facades\DB::raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as lop_count"),
                \Illuminate\Support\Facades\DB::raw("SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_count"),
                \Illuminate\Support\Facades\DB::raw("MAX(source) as max_source"),
                \Illuminate\Support\Facades\DB::raw("MIN(source) as min_source")
            )
            ->groupBy('employee_id')
            ->get()
            ->keyBy('employee_id');

        $detailData = [];

        foreach ($employees as $employee) {
            $summary = $recordsSummary->get($employee->id);

            $presentCount = $summary ? (int) $summary->present_count : 0;
            $lopCount = $summary ? (int) $summary->lop_count : 0;
            $leaveCount = $summary ? (int) $summary->leave_count : 0;

            $sourceLabel = '🔴 No Attendance';
            if ($summary) {
                $minSource = $summary->min_source;
                $maxSource = $summary->max_source;
                if ($minSource === $maxSource) {
                    if ($maxSource === 'uploaded') $sourceLabel = '🔵 Uploaded';
                    elseif ($maxSource === 'live_punch') $sourceLabel = '🟢 Live Punch';
                    else $sourceLabel = '🔵 Uploaded';
                } else {
                    $sourceLabel = '🟡 Mixed Source';
                }
            }

            $detailData[] = [
                'name' => $employee->full_name,
                'code' => $employee->employee_code,
                'present' => $presentCount,
                'lop' => $lopCount,
                'leave' => $leaveCount,
                'source' => $sourceLabel,
                'status' => 'Ready',
            ];
        }

        return response()->json([
            'client_name' => $client->company_name,
            'rows' => $detailData,
        ]);
    }
}
