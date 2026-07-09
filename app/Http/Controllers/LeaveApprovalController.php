<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LeaveRequest;
use App\Models\AttendanceRecord;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

class LeaveApprovalController extends Controller
{
    public function index()
    {
        // Admin or Manager only (middleware typically handles this, but we'll enforce just to be safe if not strictly routed)
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to leave approval queue.');
        }

        // Fetch leave requests for the queue. In a real app with Managers, we'd scope this to their clients' employees.
        // For now, as per instruction, admin/manager see pending leaves.
        $leaves = LeaveRequest::with(['employee.client'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        // Map data to what the UI expects
        $mappedLeaves = $leaves->map(function($leave) {
            return [
                'id' => $leave->id,
                'empName' => $leave->employee->full_name,
                'empCode' => $leave->employee->employee_code,
                'client' => $leave->employee->client ? $leave->employee->client->name : 'N/A',
                'leaveType' => ucwords(str_replace('_', ' ', $leave->leave_type)) . ' Leave',
                'leaveCode' => $leave->leave_type,
                'dateRange' => $leave->from_date->format('F j, Y') . ' - ' . $leave->to_date->format('F j, Y'),
                'days' => (float)$leave->days_count,
                'reason' => $leave->reason,
                'status' => $leave->status,
                'rejection_reason' => $leave->rejection_reason,
            ];
        });

        return Inertia::render('Employees/LeaveApprovalQueue', [
            'initialLeaves' => $mappedLeaves
        ]);
    }

    public function approve(Request $request, $id)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to leave approval.');
        }

        $leave = LeaveRequest::findOrFail($id);

        if ($leave->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending requests can be approved.');
        }

        DB::transaction(function () use ($leave) {
            $leave->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
                'decided_at' => now(),
            ]);

            $period = CarbonPeriod::create($leave->from_date, $leave->to_date);

            foreach ($period as $date) {
                $dateStr = $date->toDateString();
                $existingRecord = AttendanceRecord::where('employee_id', $leave->employee_id)
                    ->whereDate('attendance_date', $dateStr)
                    ->first();

                if ($existingRecord) {
                    // If it has real live punch data, preserve the times (Approach 2)
                    if ($existingRecord->source === 'live_punch') {
                        $existingRecord->update([
                            'status' => 'on_leave',
                            'source' => 'override'
                        ]);
                    } else {
                        // Fully overwrite
                        $existingRecord->update([
                            'punch_in_time' => null,
                            'punch_out_time' => null,
                            'hours_worked' => null,
                            'status' => 'on_leave',
                            'source' => 'override'
                        ]);
                    }
                } else {
                    AttendanceRecord::create([
                        'employee_id' => $leave->employee_id,
                        'attendance_date' => $dateStr,
                        'status' => 'on_leave',
                        'source' => 'override'
                    ]);
                }
            }
        });

        return redirect()->back()->with('success', 'Leave request approved successfully.');
    }

    public function reject(Request $request, $id)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to leave approval.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:10'
        ]);

        $leave = LeaveRequest::findOrFail($id);

        if ($leave->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending requests can be rejected.');
        }

        $leave->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'approved_by' => auth()->id(),
            'decided_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Leave request rejected successfully.');
    }
}
