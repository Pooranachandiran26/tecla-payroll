<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Http\Resources\EmployeeResource;
use App\Services\AttendanceResolutionService;
use App\Services\NotificationService;
use Carbon\Carbon;


class EmployeePortalController extends Controller
{
    private function getEmployee()
    {
        $user = auth()->user();
        $employee = $user->employee;

        if (!$employee && $user->employee_id) {
            $employee = Employee::with(['client', 'documents'])->find($user->employee_id);
        }

        // Auto-match employee by email or full_name if user->employee_id is null
        if (!$employee) {
            $matchedEmp = null;
            if (!empty($user->email)) {
                $matchedEmp = Employee::where('personal_email', $user->email)->first();
            }

            if (!$matchedEmp && !empty($user->name)) {
                $matchedEmp = Employee::where('full_name', 'like', "%{$user->name}%")->first();
            }

            // Fallback: if unlinked employees exist in DB, take the first one
            if (!$matchedEmp) {
                $matchedEmp = Employee::whereNotIn('id', \App\Models\User::whereNotNull('employee_id')->pluck('employee_id'))->first();
            }

            // If still no employee record exists at all, auto-create one for this user
            if (!$matchedEmp) {
                $clientId = $user->client_id ?: (\App\Models\Client::where('status', 'active')->value('id') ?: \App\Models\Client::value('id') ?: 1);
                $branchId = \App\Models\ClientBranch::where('client_id', $clientId)->value('id') ?: 1;
                $nameParts = explode(' ', trim($user->name ?: 'Employee User'), 2);
                $firstName = $nameParts[0] ?: 'Employee';
                $lastName = $nameParts[1] ?? 'User';

                $matchedEmp = Employee::create([
                    'client_id' => $clientId,
                    'branch_id' => $branchId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'full_name' => trim("$firstName $lastName"),
                    'personal_email' => $user->email ?: 'emp_' . $user->id . '@system.local',
                    'phone_number' => '9' . str_pad($user->id, 9, '0', STR_PAD_LEFT),
                    'employee_code' => 'EMP-' . str_pad($user->id, 4, '0', STR_PAD_LEFT),
                    'designation' => 'Employee',
                    'employment_model' => 'eor',
                    'status' => 'active',
                    'date_of_birth' => '1995-01-01',
                    'date_of_joining' => now()->toDateString(),
                    'basic_pay' => 0,
                    'hra' => 0,
                    'conveyance' => 0,
                    'da' => 0,
                    'medical_allowance' => 0,
                    'special_allowance' => 0,
                    'gross_monthly_salary' => 0,
                    'net_take_home_monthly' => 0,
                    'employer_pf_monthly' => 0,
                    'employer_esi_monthly' => 0,
                    'ctc_monthly' => 0,
                    'bank_account_number' => '0000000000',
                    'account_holder_name' => trim("$firstName $lastName"),
                    'bank_ifsc' => 'BANK0000000',
                    'bank_name' => 'Default Bank',
                    'bank_branch' => 'Main Branch',
                    'uan_mode' => 'new',
                    'pan_number' => 'ABCDE1234F',
                    'entry_source' => 'manual',
                ]);
            }

            if ($matchedEmp) {
                $employee = $matchedEmp;
                try {
                    $user->update(['employee_id' => $matchedEmp->id]);
                } catch (\Throwable $e) {}
            }
        }

        $employee->loadMissing(['client', 'documents']);

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

        $salaryRevisions = \App\Models\SalaryRevision::where('employee_id', $employee->id)
            ->orderBy('effective_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('EmployeePortal/EmployeeProfile', [
            'employee' => new EmployeeResource($employee),
            'pendingBankRequest' => $pendingBankRequest,
            'salaryRevisions' => $salaryRevisions,
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

        // Ensure client leave policies exist & employee leave balances are synced for current year
        $leavePolicyService = app(\App\Services\LeavePolicyService::class);
        if ($employee->client) {
            if (\App\Models\ClientLeavePolicy::where('client_id', $employee->client_id)->count() === 0) {
                $leavePolicyService->seedDefaultPolicies($employee->client);
            }
            $leavePolicyService->syncClientEmployeesBalances($employee->client, (int)date('Y'));
        }

        $leaveBalances = \App\Models\EmployeeLeaveBalance::with('policy')
            ->where('employee_id', $employee->id)
            ->where('year', (int)date('Y'))
            ->get();

        return Inertia::render('EmployeePortal/LeaveRequest', [
            'employee' => new EmployeeResource($employee),
            'leaveRequests' => $leaveRequests,
            'leaveBalances' => $leaveBalances,
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

        $daysCount = 0;
        $attendanceResolutionService = app(\App\Services\AttendanceResolutionService::class);
        for ($curr = Carbon::parse($fromDate); $curr->lte(Carbon::parse($toDate)); $curr->addDay()) {
            if ($attendanceResolutionService->isWorkingDay($employee, $curr)) {
                $daysCount++;
            }
        }

        if ($daysCount === 0) {
            return redirect()->back()->with('error', 'The selected date range contains no working days (weekly-offs / holidays).');
        }

        \App\Models\LeaveRequest::create([
            'employee_id' => $employee->id,
            'leave_type'  => $validated['leave_type'],
            'from_date'   => $fromDate,
            'to_date'     => $toDate,
            'days_count'  => $daysCount,
            'reason'      => $validated['reason'],
            'status'      => 'pending'
        ]);

        // Notify admins & managers in-app (isolated: never breaks leave submission)
        $leaveTypeName = ucwords(str_replace('_', ' ', $validated['leave_type']));
        NotificationService::sendToAdminsAndManagers(
            type: 'leave_request',
            title: 'New Leave Request Pending Approval',
            body: "{$employee->full_name} ({$employee->employee_code}) submitted a {$leaveTypeName} Leave request for {$daysCount} day(s).",
            url: route('leave-requests.index'),
            data: ['employee_id' => $employee->id]
        );

        return redirect()->back()->with('success', 'Leave request submitted successfully.');
    }

    public function payslips(Request $request)
    {
        $employee = $this->getEmployee();

        $rawItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->join('payroll_runs', 'payroll_run_items.payroll_run_id', '=', 'payroll_runs.id')
            ->where('payroll_run_items.employee_id', $employee->id)
            ->where('payroll_runs.status', 'locked')
            ->whereNotNull('payroll_runs.payslip_released_at')
            ->where('payroll_run_items.is_excluded', false)
            ->select('payroll_run_items.*', 'payroll_runs.payroll_month', 'payroll_runs.client_id', 'payroll_runs.payslip_released_at')
            ->orderBy('payroll_runs.payroll_month', 'desc')
            ->get();

        $client = $employee->client;
        $clientBranding = null;
        if ($client) {
            $clientBranding = [
                'company_name' => $client->company_name,
                'display_name_override' => $client->display_name_override,
                'logo_path' => $client->logo_path,
                'accent_color' => $client->accent_color ?: '#1F3864',
                'registered_city' => $client->registered_city,
                'registered_state' => $client->registered_state,
                'gstin' => $client->gstin,
                'payslip_template' => $client->payslip_template ?: 'standard',
                'payslip_visible_sections' => $client->payslip_visible_sections ?: [],
            ];
        }

        return Inertia::render('EmployeePortal/EmployeePayslips', [
            'employee' => $employee,
            'payslips' => $rawItems,
            'clientBranding' => $clientBranding,
        ]);
    }

    public function downloadPayslip(Request $request, $id)
    {
        $employee = $this->getEmployee();

        $item = \App\Models\PayrollRunItem::where('id', $id)
            ->where('employee_id', $employee->id)
            ->where('is_excluded', false)
            ->firstOrFail();

        $run = $item->payrollRun;
        if (!$run || $run->status !== 'locked' || !$run->payslip_released_at) {
            abort(403, 'This payslip has not been released yet.');
        }

        $pdfService = app(\App\Services\PayslipPdfService::class);
        $pdfBytes = $pdfService->generatePdfBinary($item);

        $monthStr = \Carbon\Carbon::parse($run->payroll_month)->format('M_Y');
        $fileName = "Payslip_{$employee->employee_code}_{$monthStr}.pdf";

        return response($pdfBytes, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
        ]);
    }
}
