<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Http\Resources\EmployeeResource;
use App\Services\AttendanceResolutionService;
use Carbon\Carbon;

class EmployeePortalController extends Controller
{
    private function getEmployee()
    {
        $employeeId = auth()->user()->employee_id;
        if (!$employeeId) {
            abort(403, 'No employee record linked to this user account.');
        }

        $employee = Employee::with(['client', 'documents'])->findOrFail($employeeId);
        
        // Ensure user can only view their own profile
        if (request()->user()->cannot('viewOwnProfile', $employee)) {
            abort(403, 'Unauthorized access to employee data.');
        }

        return $employee;
    }

    public function dashboard()
    {
        $employee = $this->getEmployee();

        $today = Carbon::today();

        // Check if punched in today
        $todayRecord = AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', $today->toDateString())
            ->first();

        // 1. Attendance Summary (This Month)
        $monthStart = $today->copy()->startOfMonth()->toDateString();
        $monthEnd = $today->copy()->endOfMonth()->toDateString();

        $monthlyAttendance = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->get();

        $attendanceStats = [
            'days_present' => $monthlyAttendance->where('status', 'present')->count(),
            'days_half_day' => $monthlyAttendance->where('status', 'half_day')->count(),
            'days_on_leave' => $monthlyAttendance->where('status', 'on_leave')->count(),
            'days_absent' => 0 // Explicitly 0: absent logic is deferred to Payroll
        ];

        // 2. Leave Summary
        $pendingLeaveCount = \App\Models\LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->count();

        $recentLeave = \App\Models\LeaveRequest::where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->first();

        $leaveStats = [
            'pending_count' => $pendingLeaveCount,
            'recent_request' => $recentLeave ? [
                'status' => $recentLeave->status,
                'from_date' => $recentLeave->from_date,
                'to_date' => $recentLeave->to_date,
                'leave_type' => $recentLeave->leave_type
            ] : null
        ];

        // 3. Document Verification Status
        // Rule: PF & ESI applicability determines if 8 or 5 docs are required.
        $requiredDocsCount = ($employee->pf_applicable || $employee->esi_applicable) ? 8 : 5;
        $verifiedDocsCount = $employee->documents->where('status', 'verified')->count();

        $documentStats = [
            'verified' => $verifiedDocsCount,
            'required' => $requiredDocsCount
        ];

        // 4. Resolve Day Banner for Daily Time Tracker
        $resolutionService = app(AttendanceResolutionService::class);
        $resolved = $resolutionService->resolveDayTypeForEmployee($employee, $today);

        $dayBanner = null;

        if ($resolved['override']) {
            $override = $resolved['override'];
            if ($override->attendance_day_type === 'work_day') {
                $origLabel = $resolved['natural_type'] === 'holiday'
                    ? 'holiday'
                    : ($resolved['natural_type'] === 'weekly_off' ? 'weekly off' : 'day off');
                $dayBanner = [
                    'type' => 'info',
                    'message' => "📋 You're scheduled to work today as part of an approved day swap (normally {$origLabel})."
                ];
            } else {
                $swapTargetDate = $override->swap_target_date
                    ? Carbon::parse($override->swap_target_date)->format('Y-m-d')
                    : '';
                $dayBanner = [
                    'type' => 'success',
                    'message' => "✅ You're on an approved day off today (swapped from {$swapTargetDate}). Punching in is optional but will be recorded if you do."
                ];
            }
        } else {
            if ($resolved['effective_type'] === 'holiday') {
                $holidayName = optional($resolved['holiday'])->name ?? 'Company Holiday';
                $dayBanner = [
                    'type' => 'warning',
                    'message' => "🌴 Today is a company holiday ({$holidayName}). You can still punch in if you're working today."
                ];
            } elseif ($resolved['effective_type'] === 'weekly_off') {
                $dayBanner = [
                    'type' => 'info',
                    'message' => "🛌 Today is your usual day off. You can still punch in if you're working today."
                ];
            }
        }

        return Inertia::render('EmployeePortal/EmployeeDashboard', [
            'employee' => new EmployeeResource($employee),
            'todayAttendance' => $todayRecord,
            'attendanceStats' => $attendanceStats,
            'leaveStats' => $leaveStats,
            'documentStats' => $documentStats,
            'todayDayBanner' => $dayBanner,
            'dayBanner' => $dayBanner,
        ]);
    }

    public function profile()
    {
        $employee = $this->getEmployee();
        $pendingBankRequest = \App\Models\BankChangeRequest::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->first();

        return Inertia::render('EmployeePortal/EmployeeProfile', [
            'employee' => new EmployeeResource($employee),
            'pendingBankRequest' => $pendingBankRequest
        ]);
    }

    public function storeDocument(Request $request)
    {
        $employee = $this->getEmployee();
        
        $request->validate([
            'document_type' => 'required|string',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB max
        ]);

        // Find existing document of the same type
        $existing = \App\Models\EmployeeDocument::where('employee_id', $employee->id)
            ->where('document_type', $request->document_type)
            ->first();
            
        $path = $request->file('file')->store('employee_documents');

        if ($existing) {
            \Illuminate\Support\Facades\Storage::delete($existing->file_path);
            $existing->update([
                'file_path' => $path,
                'status' => 'pending',
                'rejection_reason' => null,
            ]);
        } else {
            \App\Models\EmployeeDocument::create([
                'employee_id' => $employee->id,
                'document_type' => $request->document_type,
                'file_path' => $path,
                'status' => 'pending'
            ]);
        }

        // Notify admins
        \App\Jobs\NotifyWatchersJob::dispatch(
            'system_alerts',
            'Document Uploaded',
            "Employee {$employee->full_name} ({$employee->employee_code}) uploaded a new {$request->document_type}.",
            null
        );

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    public function viewDocument($docId)
    {
        $employee = $this->getEmployee();
        $document = \App\Models\EmployeeDocument::where('employee_id', $employee->id)->findOrFail($docId);

        if (!\Illuminate\Support\Facades\Storage::disk('local')->exists($document->file_path)) {
            abort(404, 'Document file not found.');
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->response(
            $document->file_path,
            null,
            ['Content-Disposition' => 'inline']
        );
    }

    public function attendance()
    {
        $employee = $this->getEmployee();
        
        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->orderBy('attendance_date', 'desc')
            ->paginate(30);

        $correctionRequests = \App\Models\AttendanceCorrectionRequest::where('employee_id', $employee->id)
            ->orderBy('attendance_date', 'desc')
            ->get();

        return Inertia::render('EmployeePortal/EmployeeAttendance', [
            'employee' => new EmployeeResource($employee),
            'attendanceRecords' => $records,
            'correctionRequests' => $correctionRequests
        ]);
    }

    public function punchIn(Request $request)
    {
        $employee = $this->getEmployee();
        $today = Carbon::today()->toDateString();

        if ($employee->date_of_joining && Carbon::today()->lt(Carbon::parse($employee->date_of_joining)->startOfDay())) {
            return redirect()->back()->with('warning', "Cannot punch in before your date of joining ({$employee->date_of_joining}).");
        }

        $existing = AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', $today)
            ->first();

        $latitude = $request->input('latitude');
        $longitude = $request->input('longitude');
        $placeName = $request->input('place_name');

        if ($existing) {
            if ($existing->punch_in_time) {
                return redirect()->back()->with('warning', 'You have already punched in today.');
            }
            $existing->update([
                'punch_in_time' => now(),
                'source' => 'live_punch',
                'latitude' => $latitude,
                'longitude' => $longitude,
                'place_name' => $placeName,
            ]);
        } else {
            AttendanceRecord::create([
                'employee_id' => $employee->id,
                'attendance_date' => $today,
                'punch_in_time' => now(),
                'source' => 'live_punch',
                'latitude' => $latitude,
                'longitude' => $longitude,
                'place_name' => $placeName,
            ]);
        }

        return redirect()->back()->with('success', 'Successfully punched in.');
    }

    public function punchOut()
    {
        $employee = $this->getEmployee();
        $today = Carbon::today()->toDateString();

        $record = AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', $today)
            ->first();

        if (!$record || !$record->punch_in_time) {
            return redirect()->back()->with('warning', 'You must punch in first.');
        }

        if ($record->punch_out_time) {
            return redirect()->back()->with('warning', 'You have already punched out today.');
        }

        $punchInTime = Carbon::parse($record->punch_in_time);
        $punchOutTime = now();
        
        // Calculate hours worked
        $minutes = $punchInTime->diffInMinutes($punchOutTime);
        $hoursWorked = round($minutes / 60, 2);

        // Explicit 3-tier status derivation
        if ($hoursWorked >= 8) {
            $status = 'present';
        } else if ($hoursWorked >= 4 && $hoursWorked < 8) {
            $status = 'half_day';
        } else {
            // < 4 hours is still half_day to avoid silently marking absent
            $status = 'half_day';
        }
        
        // SUGGESTION: Weekend exclusion and LOP calculations are deferred entirely to the future Payroll module.

        $record->update([
            'punch_out_time' => $punchOutTime,
            'hours_worked' => $hoursWorked,
            'status' => $status
        ]);

        return redirect()->back()->with('success', 'Successfully punched out.');
    }

    public function correctionRequests()
    {
        $employee = $this->getEmployee();
        
        $requests = \App\Models\AttendanceCorrectionRequest::where('employee_id', $employee->id)
            ->orderBy('attendance_date', 'desc')
            ->get();
            
        return response()->json(['data' => $requests]);
    }

    public function storeCorrectionRequest(Request $request)
    {
        $employee = $this->getEmployee();
        
        $validated = $request->validate([
            'attendance_date' => 'required|date|before_or_equal:today',
            'requested_punch_in_time' => 'required|date',
            'requested_punch_out_time' => 'required|date|after:requested_punch_in_time',
            'reason_category' => 'required|in:forgot_to_punch_out,forgot_to_punch_in,system_error,emergency_early_leave,other',
            'reason_details' => 'required|string|min:10',
        ]);

        $date = Carbon::parse($validated['attendance_date'])->toDateString();

        // Check for existing pending request
        $existingRequest = \App\Models\AttendanceCorrectionRequest::where('employee_id', $employee->id)
            ->whereDate('attendance_date', $date)
            ->where('status', 'pending')
            ->first();

        if ($existingRequest) {
            return redirect()->back()->with('error', 'Correction already pending for this date.');
        }

        // Snapshot original attendance
        $original = AttendanceRecord::where('employee_id', $employee->id)
            ->whereDate('attendance_date', $date)
            ->first();

        \App\Models\AttendanceCorrectionRequest::create([
            'employee_id' => $employee->id,
            'attendance_date' => $date,
            'original_punch_in_time' => $original ? $original->punch_in_time : null,
            'original_punch_out_time' => $original ? $original->punch_out_time : null,
            'original_status' => $original ? $original->status : null,
            'requested_punch_in_time' => $validated['requested_punch_in_time'],
            'requested_punch_out_time' => $validated['requested_punch_out_time'],
            'reason_category' => $validated['reason_category'],
            'reason_details' => $validated['reason_details'],
            'status' => 'pending',
        ]);
        
        // SUGGESTION: Manager approve() method must:
        // 1. Re-derive hours_worked and status from requested_punch_in_time/requested_punch_out_time using the SAME 3-tier logic.
        // 2. Write corrected values into attendance_records with source='override'.
        // 3. Set reviewed_by/reviewed_at and log via AuditService.

        return redirect()->back()->with('success', 'Correction request submitted successfully.');
    }

    public function leave()
    {
        $employee = $this->getEmployee();
        
        $leaveRequests = \App\Models\LeaveRequest::where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return Inertia::render('EmployeePortal/LeaveRequest', [
            'employee' => new EmployeeResource($employee),
            'leaveRequests' => $leaveRequests
        ]);
    }

    public function storeLeaveRequest(Request $request)
    {
        $employee = $this->getEmployee();
        
        $validated = $request->validate([
            'leave_type' => 'required|in:casual,sick,earned,unpaid',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'reason' => 'required|string|min:10',
        ]);

        $fromDate = Carbon::parse($validated['from_date'])->toDateString();
        $toDate = Carbon::parse($validated['to_date'])->toDateString();
        
        // Prevent overlapping PENDING or APPROVED leave requests
        $overlap = \App\Models\LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($query) use ($fromDate, $toDate) {
                $query->whereBetween('from_date', [$fromDate, $toDate])
                      ->orWhereBetween('to_date', [$fromDate, $toDate])
                      ->orWhere(function ($q) use ($fromDate, $toDate) {
                          $q->where('from_date', '<=', $fromDate)
                            ->where('to_date', '>=', $toDate);
                      });
            })->exists();

        if ($overlap) {
            return redirect()->back()->with('error', 'You already have a pending or approved leave request for this date range.');
        }

        $daysCount = Carbon::parse($fromDate)->diffInDays(Carbon::parse($toDate)) + 1;

        \App\Models\LeaveRequest::create([
            'employee_id' => $employee->id,
            'leave_type' => $validated['leave_type'],
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'days_count' => $daysCount,
            'reason' => $validated['reason'],
            'status' => 'pending'
        ]);

        return redirect()->back()->with('success', 'Leave request submitted successfully.');
    }
}
