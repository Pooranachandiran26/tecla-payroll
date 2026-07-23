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

        $targetMonth = $request->query('month', '2026-07');
        $monthStart = Carbon::parse($targetMonth . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();

        $clients = Client::where('status', 'active')->orderBy('id', 'desc')->get();
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

        $targetMonth = $request->query('month', '2026-07');
        $monthStart = Carbon::parse($targetMonth . '-01')->toDateString();
        $monthEnd = Carbon::parse($targetMonth . '-01')->endOfMonth()->toDateString();

        $client = Client::findOrFail($clientId);
        $employees = Employee::where('client_id', $clientId)
            ->where('status', 'active')
            ->get();

        $totalChecked = $employees->count();
        $eligibleCount = 0;
        $exclusions = [];
        $warnings = [];

        foreach ($employees as $employee) {
            $eligibility = $this->eligibilityService->checkEmployee($employee, $client, $monthStart, $monthEnd);

            if ($eligibility['is_eligible']) {
                $eligibleCount++;
            } else {
                foreach ($eligibility['exclusions'] as $exc) {
                    $exclusions[] = "{$employee->full_name} ({$employee->employee_code}): {$exc}";
                }
            }

            foreach ($eligibility['warnings'] as $war) {
                $warnings[] = "{$employee->full_name} ({$employee->employee_code}): {$war}";
            }
        }

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

        $detailData = [];

        foreach ($employees as $employee) {
            // Aggregate counts
            $res = $this->resolutionService->resolveForEmployee($employee, $monthStart, $monthEnd);

            // Fetch actual leaves count (status = on_leave)
            $leaveCount = AttendanceRecord::where('employee_id', $employee->id)
                ->whereBetween('attendance_date', [$monthStart, $monthEnd])
                ->where('status', 'on_leave')
                ->count();

            // Source Label prefix mapping
            $sourceLabel = '🔴 No Attendance';
            if ($res['attendance_source'] === 'live_punch') {
                // If there are records in the database, it's live_punch
                $hasRecs = AttendanceRecord::where('employee_id', $employee->id)
                    ->whereBetween('attendance_date', [$monthStart, $monthEnd])
                    ->exists();
                $sourceLabel = $hasRecs ? '🟢 Live Punch' : '🔴 No Attendance';
            } elseif ($res['attendance_source'] === 'uploaded') {
                $sourceLabel = '🔵 Uploaded';
            } elseif ($res['attendance_source'] === 'mixed') {
                $sourceLabel = '🟡 Mixed Source';
            }

            // Run eligibility to decide status
            $eligibility = $this->eligibilityService->checkEmployee($employee, $client, $monthStart, $monthEnd);
            $status = $eligibility['is_eligible'] ? 'Ready' : 'Check Required';

            $detailData[] = [
                'name' => $employee->full_name,
                'code' => $employee->employee_code,
                'present' => $res['paid_days'] - $leaveCount, // exclude leave from present days display count to avoid confusion
                'lop' => $res['lop_days'],
                'leave' => $leaveCount,
                'source' => $sourceLabel,
                'status' => $status,
            ];
        }

        return response()->json([
            'client_name' => $client->company_name,
            'rows' => $detailData,
        ]);
    }
}
