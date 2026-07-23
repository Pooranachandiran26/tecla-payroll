<?php

namespace App\Http\Controllers;

use App\Jobs\NotifyWatchersJob;
use App\Mail\DaySwapApprovedMail;
use App\Mail\DaySwapRejectedMail;
use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Services\AttendanceResolutionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class DaySwapController extends Controller
{
    /**
     * Display a paginated listing of day swap requests for Admin/Manager.
     */
    public function index(Request $request)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to day swap requests.');
        }

        // Fetch primary swap rows (work_day half of the pair)
        $query = EmployeeAttendanceOverride::with(['employee.client'])
            ->where('attendance_day_type', 'work_day')
            ->whereNotNull('swap_target_date');

        if ($request->search) {
            $search = $request->search;
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('company_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->client_id) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('client_id', $request->client_id);
            });
        }

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        $mappedRequests = $requests->through(function ($req) {
            return [
                'id' => $req->id,
                'empName' => $req->employee ? $req->employee->full_name : 'N/A',
                'empCode' => $req->employee ? $req->employee->employee_code : 'N/A',
                'client' => ($req->employee && $req->employee->client) ? $req->employee->client->company_name : 'N/A',
                'originalDate' => $req->override_date ? Carbon::parse($req->override_date)->format('Y-m-d') : '',
                'newDate' => $req->swap_target_date ? Carbon::parse($req->swap_target_date)->format('Y-m-d') : '',
                'reason' => $req->reason,
                'status' => $req->status,
                'rejectionReason' => $req->rejection_reason,
                'date' => $req->created_at ? $req->created_at->format('F j, Y') : '',
            ];
        });

        $clients = Client::where('status', 'active')->select('id', 'company_name')->orderBy('id', 'desc')->get();

        return Inertia::render('Employees/DaySwapRequests', [
            'requests' => $mappedRequests,
            'clients' => $clients,
            'filters' => $request->only(['search', 'client_id', 'status'])
        ]);
    }

    /**
     * Display current employee's swap requests in Employee Portal.
     */
    public function employeeIndex(Request $request)
    {
        $employeeId = auth()->user()->employee_id;
        if (!$employeeId) {
            abort(403, 'No employee record linked to your user account.');
        }

        $requests = EmployeeAttendanceOverride::where('employee_id', $employeeId)
            ->where('attendance_day_type', 'work_day')
            ->whereNotNull('swap_target_date')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($req) use ($employeeId) {
                $origDate = Carbon::parse($req->override_date)->format('Y-m-d');
                $newDate = Carbon::parse($req->swap_target_date)->format('Y-m-d');

                $conflictNote = null;
                if ($req->status === 'pending') {
                    $attRecord = AttendanceRecord::where('employee_id', $employeeId)
                        ->whereIn('attendance_date', [$origDate, $newDate])
                        ->first();

                    if ($attRecord) {
                        $conflictDate = Carbon::parse($attRecord->attendance_date)->format('Y-m-d');
                        $conflictNote = "Heads up — you punched in on {$conflictDate} ({$attRecord->status}), which conflicts with this pending swap request. An admin won't be able to approve this until the conflict is resolved. Note: withdrawing and resubmitting for {$conflictDate} will still be blocked because attendance is recorded — please pick dates without recorded attendance or contact your admin.";
                    }
                }

                return [
                    'id' => $req->id,
                    'originalDate' => $origDate,
                    'newDate' => $newDate,
                    'reason' => $req->reason,
                    'status' => $req->status,
                    'rejectionReason' => $req->rejection_reason,
                    'created_at' => $req->created_at->format('F j, Y'),
                    'conflictNote' => $conflictNote,
                    'canWithdraw' => ($req->status === 'pending'),
                ];
            });

        return Inertia::render('EmployeePortal/DaySwapRequests', [
            'requests' => $requests
        ]);
    }

    /**
     * Submit a day swap request from the Employee Portal.
     */
    public function store(Request $request)
    {
        $employeeId = auth()->user()->employee_id;
        if (!$employeeId) {
            abort(403, 'No employee record linked to your user account.');
        }

        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'original_date' => 'required|date',
            'new_date' => 'required|date|different:original_date',
            'reason' => 'required|string|min:5|max:500',
        ]);

        $originalDate = Carbon::parse($validated['original_date'])->toDateString();
        $newDate = Carbon::parse($validated['new_date'])->toDateString();

        // ════════════════════════════════════════════════════════════════
        // GUARD 1: Block if either date is in the PAST (before today).
        // ════════════════════════════════════════════════════════════════
        $today = Carbon::today()->toDateString();
        if ($originalDate < $today || $newDate < $today) {
            $pastDate = $originalDate < $today ? $originalDate : $newDate;
            return redirect()->back()->withErrors([
                'original_date' => "Cannot request a day swap involving date {$pastDate} — it is in the past."
            ]);
        }

        // ════════════════════════════════════════════════════════════════
        // GUARD 2: Block no-op swaps — both dates resolve to the SAME
        // non-work_day classification (holiday-for-holiday or
        // weekly_off-for-weekly_off). work_day-for-work_day is ALLOWED
        // (legitimate schedule change). holiday-vs-weekly_off is ALLOWED
        // (different reasons for being paid).
        // ════════════════════════════════════════════════════════════════
        $classOriginal = $this->classifyDateForEmployee($employee, $originalDate);
        $classNew = $this->classifyDateForEmployee($employee, $newDate);

        if ($classOriginal !== 'work_day' && $classNew !== 'work_day' && $classOriginal === $classNew) {
            $typeLabel = $classOriginal === 'holiday' ? 'holidays' : 'weekly offs';
            return redirect()->back()->withErrors([
                'original_date' => "Cannot swap: both {$originalDate} and {$newDate} are {$typeLabel} — this would be a no-op swap with zero effect on your schedule."
            ]);
        }

        // ════════════════════════════════════════════════════════════════
        // GUARD 3: Block if either date already has a PENDING override
        // request (prevents duplicate/overlapping pending requests).
        // ════════════════════════════════════════════════════════════════
        $pendingConflict = EmployeeAttendanceOverride::where('employee_id', $employee->id)
            ->whereIn('override_date', [$originalDate, $newDate])
            ->where('status', 'pending')
            ->first();

        if ($pendingConflict) {
            $conflictDate = Carbon::parse($pendingConflict->override_date)->format('Y-m-d');
            return redirect()->back()->withErrors([
                'original_date' => "Date {$conflictDate} already has a pending day swap request. Please wait for it to be approved or rejected before submitting another."
            ]);
        }

        // ════════════════════════════════════════════════════════════════
        // GUARD 4 (SUBMISSION TIME): Block if either date ALREADY has a
        // real attendance record (punched/uploaded).
        // ════════════════════════════════════════════════════════════════
        $existingRecord = AttendanceRecord::where('employee_id', $employee->id)
            ->whereIn('attendance_date', [$originalDate, $newDate])
            ->first();

        if ($existingRecord) {
            $conflictDate = Carbon::parse($existingRecord->attendance_date)->format('Y-m-d');
            return redirect()->back()->withErrors([
                'original_date' => "Cannot request a day swap for date {$conflictDate} — a real attendance record (status: {$existingRecord->status}) already exists for this date."
            ]);
        }

        // ════════════════════════════════════════════════════════════════
        // EXISTING GUARD: Block if either date already has an APPROVED
        // override (prevents conflicting approved overrides).
        // ════════════════════════════════════════════════════════════════
        $approvedConflict = EmployeeAttendanceOverride::where('employee_id', $employee->id)
            ->whereIn('override_date', [$originalDate, $newDate])
            ->where('status', 'approved')
            ->first();

        if ($approvedConflict) {
            $conflictDate = Carbon::parse($approvedConflict->override_date)->format('Y-m-d');
            return redirect()->back()->withErrors([
                'original_date' => "Date {$conflictDate} already has an approved attendance override. Cannot create a conflicting swap."
            ]);
        }

        // Create paired rows in DB transaction
        DB::transaction(function () use ($employee, $originalDate, $newDate, $validated) {
            // Row 1: The off day being worked ('work_day')
            EmployeeAttendanceOverride::create([
                'employee_id' => $employee->id,
                'override_date' => $originalDate,
                'attendance_day_type' => 'work_day',
                'reason' => $validated['reason'],
                'status' => 'pending',
                'requested_by' => auth()->id(),
                'swap_target_date' => $newDate,
            ]);

            // Row 2: The work day taken off instead ('weekly_off')
            EmployeeAttendanceOverride::create([
                'employee_id' => $employee->id,
                'override_date' => $newDate,
                'attendance_day_type' => 'weekly_off',
                'reason' => $validated['reason'],
                'status' => 'pending',
                'requested_by' => auth()->id(),
                'swap_target_date' => $originalDate,
            ]);
        });

        // Dispatch watcher notification with context URL
        NotifyWatchersJob::dispatch(
            'system_alerts',
            'Attendance Day Swap Requested',
            "Employee {$employee->full_name} ({$employee->employee_code}) requested a day swap: working on {$originalDate} for {$newDate} off.",
            route('employees.day-swaps')
        );

        return redirect()->back()->with('success', 'Day swap request submitted successfully and queued for admin approval.');
    }

    /**
     * Approve a day swap request.
     */
    public function approve(Request $request, $id)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to day swap approvals.');
        }

        $req = EmployeeAttendanceOverride::with('employee')->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending swap requests can be approved.');
        }

        $origDateStr = Carbon::parse($req->override_date)->toDateString();
        $targetDateStr = Carbon::parse($req->swap_target_date)->toDateString();

        // ════════════════════════════════════════════════════════════════
        // STRICT PAIRED ROW LOOKUP (LOUD FAILURE GUARD):
        // If matching paired row is missing or not pending, ABORT cleanly.
        // ════════════════════════════════════════════════════════════════
        $pairedReq = EmployeeAttendanceOverride::where('employee_id', $req->employee_id)
            ->whereDate('override_date', $targetDateStr)
            ->whereDate('swap_target_date', $origDateStr)
            ->where('status', 'pending')
            ->first();

        if (!$pairedReq) {
            return redirect()->back()->with('error', 'Corrupted day swap request: Matching paired request row could not be found or is not pending. Action aborted to prevent mismatched state.');
        }

        // ════════════════════════════════════════════════════════════════
        // GUARD 4: Block if either date already has a REAL attendance
        // record (punched/uploaded since submission).
        // ════════════════════════════════════════════════════════════════
        $existingRecord = AttendanceRecord::where('employee_id', $req->employee_id)
            ->whereIn('attendance_date', [$origDateStr, $targetDateStr])
            ->first();

        if ($existingRecord) {
            $conflictDate = Carbon::parse($existingRecord->attendance_date)->format('Y-m-d');
            return redirect()->back()->with('error',
                "This request can't be approved because the employee already has a recorded {$existingRecord->status} for {$conflictDate}. Consider rejecting this request so the employee can resubmit correctly."
            );
        }

        // ════════════════════════════════════════════════════════════════
        // GUARD 5: Block if either date is covered by an APPROVED leave
        // request (leave_requests table, from_date ≤ date ≤ to_date).
        // ════════════════════════════════════════════════════════════════
        $approvedLeave = LeaveRequest::where('employee_id', $req->employee_id)
            ->where('status', 'approved')
            ->where(function ($q) use ($origDateStr, $targetDateStr) {
                $q->where(function ($q2) use ($origDateStr) {
                    $q2->whereDate('from_date', '<=', $origDateStr)->whereDate('to_date', '>=', $origDateStr);
                })->orWhere(function ($q2) use ($targetDateStr) {
                    $q2->whereDate('from_date', '<=', $targetDateStr)->whereDate('to_date', '>=', $targetDateStr);
                });
            })
            ->first();

        if ($approvedLeave) {
            // Determine which swap date falls within the leave period
            $leaveFrom = Carbon::parse($approvedLeave->from_date)->toDateString();
            $leaveTo = Carbon::parse($approvedLeave->to_date)->toDateString();
            $conflictDate = ($leaveFrom <= $origDateStr && $leaveTo >= $origDateStr)
                ? $origDateStr
                : $targetDateStr;
            return redirect()->back()->with('error',
                "Cannot approve: date {$conflictDate} is covered by an approved leave request (ID #{$approvedLeave->id}, {$leaveFrom} to {$leaveTo}). Resolve the leave conflict first."
            );
        }

        // ════════════════════════════════════════════════════════════════
        // GUARD 6: Block if either date already has ANOTHER approved
        // override (defensive re-check — something may have changed
        // between submission and approval).
        // ════════════════════════════════════════════════════════════════
        $otherApproved = EmployeeAttendanceOverride::where('employee_id', $req->employee_id)
            ->whereIn('override_date', [$origDateStr, $targetDateStr])
            ->where('status', 'approved')
            ->whereNotIn('id', [$req->id, $pairedReq->id])
            ->first();

        if ($otherApproved) {
            $conflictDate = Carbon::parse($otherApproved->override_date)->format('Y-m-d');
            return redirect()->back()->with('error',
                "Cannot approve: date {$conflictDate} already has another approved attendance override (ID #{$otherApproved->id}). This swap would create a conflict."
            );
        }

        DB::transaction(function () use ($req, $pairedReq) {
            $now = now();
            $adminId = auth()->id();

            $req->update([
                'status' => 'approved',
                'approved_by' => $adminId,
                'approved_at' => $now,
            ]);

            $pairedReq->update([
                'status' => 'approved',
                'approved_by' => $adminId,
                'approved_at' => $now,
            ]);
        });

        if ($req->employee && $req->employee->personal_email) {
            Mail::to($req->employee->personal_email)
                ->queue(new DaySwapApprovedMail(
                    $req->employee->full_name,
                    $origDateStr,
                    $targetDateStr
                ));
        }

        return redirect()->back()->with('success', "Day swap approved for {$req->employee->full_name}.");
    }

    /**
     * Reject a day swap request.
     */
    public function reject(Request $request, $id)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to day swap approvals.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:5|max:500'
        ]);

        $req = EmployeeAttendanceOverride::with('employee')->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending swap requests can be rejected.');
        }

        $origDateStr = Carbon::parse($req->override_date)->toDateString();
        $targetDateStr = Carbon::parse($req->swap_target_date)->toDateString();

        // ════════════════════════════════════════════════════════════════
        // STRICT PAIRED ROW LOOKUP (LOUD FAILURE GUARD):
        // If matching paired row is missing or not pending, ABORT cleanly.
        // ════════════════════════════════════════════════════════════════
        $pairedReq = EmployeeAttendanceOverride::where('employee_id', $req->employee_id)
            ->whereDate('override_date', $targetDateStr)
            ->whereDate('swap_target_date', $origDateStr)
            ->where('status', 'pending')
            ->first();

        if (!$pairedReq) {
            return redirect()->back()->with('error', 'Corrupted day swap request: Matching paired request row could not be found or is not pending. Action aborted to prevent mismatched state.');
        }

        DB::transaction(function () use ($req, $pairedReq, $validated) {
            $now = now();
            $adminId = auth()->id();

            $req->update([
                'status' => 'rejected',
                'rejection_reason' => $validated['rejection_reason'],
                'approved_by' => $adminId,
                'approved_at' => $now,
            ]);

            $pairedReq->update([
                'status' => 'rejected',
                'rejection_reason' => $validated['rejection_reason'],
                'approved_by' => $adminId,
                'approved_at' => $now,
            ]);
        });

        if ($req->employee && $req->employee->personal_email) {
            Mail::to($req->employee->personal_email)
                ->queue(new DaySwapRejectedMail(
                    $req->employee->full_name,
                    $origDateStr,
                    $targetDateStr,
                    $validated['rejection_reason']
                ));
        }

        return redirect()->back()->with('success', "Day swap rejected for {$req->employee->full_name}. Notice sent.");
    }

    /**
     * Withdraw a pending day swap request from the Employee Portal.
     */
    public function withdraw(Request $request, $id)
    {
        $employeeId = auth()->user()->employee_id;
        if (!$employeeId) {
            abort(403, 'No employee record linked to your user account.');
        }

        $req = EmployeeAttendanceOverride::where('employee_id', $employeeId)->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending day swap requests can be withdrawn.');
        }

        $origDateStr = Carbon::parse($req->override_date)->toDateString();
        $targetDateStr = Carbon::parse($req->swap_target_date)->toDateString();

        // Find paired request
        $pairedReq = EmployeeAttendanceOverride::where('employee_id', $employeeId)
            ->whereDate('override_date', $targetDateStr)
            ->whereDate('swap_target_date', $origDateStr)
            ->where('status', 'pending')
            ->first();

        DB::transaction(function () use ($req, $pairedReq) {
            $req->update(['status' => 'withdrawn']);
            if ($pairedReq) {
                $pairedReq->update(['status' => 'withdrawn']);
            }
        });

        return redirect()->back()->with('success', 'Day swap request withdrawn successfully.');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPER: Classify a date's "natural" type for an employee,
    // delegating to shared AttendanceResolutionService::classifyNaturalDate()
    //
    // Returns: 'holiday', 'weekly_off', or 'work_day'
    // ════════════════════════════════════════════════════════════════════════
    private function classifyDateForEmployee(Employee $employee, string $dateStr): string
    {
        $res = app(AttendanceResolutionService::class)->classifyNaturalDate($employee, $dateStr);
        return $res['type'];
    }
}
