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
    public function index(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to leave approval queue.');
        }

        $user = $request->user();
        if ($user && $user->role === 'manager' && !$user->hasModulePermission('emp_leave_approval', 'candidates')) {
            abort(403, 'You do not have permission to access Leave Approval Queue.');
        }
        $query = LeaveRequest::with(['employee.client']);

        if ($user && $user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            $query->whereHas('employee', fn($q) => $q->whereIn('client_id', $managedClientIds));
        }

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

        if ($request->leave_type && $request->leave_type !== 'all') {
            $query->where('leave_type', $request->leave_type);
        }

        $leaves = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        $mappedLeaves = $leaves->through(function ($leave) {
            return [
                'id' => $leave->id,
                'empName' => $leave->employee ? $leave->employee->full_name : 'N/A',
                'empCode' => $leave->employee ? $leave->employee->employee_code : 'N/A',
                'client' => ($leave->employee && $leave->employee->client) ? $leave->employee->client->company_name : 'N/A',
                'leaveType' => ucwords(str_replace('_', ' ', $leave->leave_type)) . ' Leave',
                'leaveCode' => $leave->leave_type,
                'dateRange' => $leave->from_date ? ($leave->from_date->format('F j, Y') . ' - ' . $leave->to_date->format('F j, Y')) : '',
                'days' => (float)$leave->days_count,
                'reason' => $leave->reason,
                'status' => $leave->status,
                'rejection_reason' => $leave->rejection_reason,
            ];
        });

        $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name')->orderBy('id', 'desc')->get();

        return Inertia::render('Employees/LeaveApprovalQueue', [
            'leaves' => $mappedLeaves,
            'clients' => $clients,
            'filters' => $request->only(['search', 'client_id', 'status', 'leave_type'])
        ]);
    }

    public function approve(Request $request, $id, \App\Services\LeavePolicyService $leavePolicyService)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to leave approval.');
        }

        $leave = LeaveRequest::findOrFail($id);

        if ($leave->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending requests can be approved.');
        }

        try {
            $result = $leavePolicyService->processApprovedLeave($leave);

            app(\App\Services\AuditService::class)->log(
                'leave.approved',
                auth()->user(),
                $leave,
                ['status' => 'pending'],
                ['status' => 'approved', 'approved_by' => auth()->id()],
                ['employee_id' => $leave->employee_id, 'leave_type' => $leave->leave_type, 'days_count' => $leave->days_count]
            );

            return redirect()->back()->with('success', $result['message']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            $msg = reset($errors)[0] ?? 'Leave approval failed.';
            return redirect()->back()->with('error', $msg);
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
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
