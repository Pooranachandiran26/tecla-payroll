<?php

namespace App\Http\Controllers;

use App\Models\AttendanceCorrectionRequest;
use App\Models\AttendanceRecord;
use App\Models\Client;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AttendanceCorrectionApprovalController extends Controller
{
    /**
     * Display a paginated listing of attendance correction requests for Admin/Manager.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to attendance correction requests.');
        }

        if ($user->role === 'manager' && !$user->hasModulePermission('emp_attendance_corrections', 'candidates')) {
            abort(403, 'You do not have permission to access Attendance Correction Requests.');
        }

        $query = AttendanceCorrectionRequest::with(['employee.client', 'reviewer']);

        if ($user->role === 'manager') {
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

        // Base query for counts before status filter
        $countsQuery = clone $query;

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
                'attendanceDate' => $req->attendance_date ? Carbon::parse($req->attendance_date)->format('Y-m-d') : '',
                'formattedDate' => $req->attendance_date ? Carbon::parse($req->attendance_date)->format('M d, Y') : '',
                'originalPunchIn' => $req->original_punch_in_time ? Carbon::parse($req->original_punch_in_time)->format('h:i A') : 'None',
                'originalPunchOut' => $req->original_punch_out_time ? Carbon::parse($req->original_punch_out_time)->format('h:i A') : 'None',
                'originalStatus' => $req->original_status ? ucfirst($req->original_status) : 'No Record',
                'requestedPunchIn' => $req->requested_punch_in_time ? Carbon::parse($req->requested_punch_in_time)->format('h:i A') : 'N/A',
                'requestedPunchOut' => $req->requested_punch_out_time ? Carbon::parse($req->requested_punch_out_time)->format('h:i A') : 'N/A',
                'reasonCategory' => ucwords(str_replace('_', ' ', $req->reason_category)),
                'reasonDetails' => $req->reason_details,
                'status' => $req->status,
                'rejectionReason' => $req->rejection_reason,
                'reviewerName' => $req->reviewer ? $req->reviewer->name : null,
                'reviewedAt' => $req->reviewed_at ? $req->reviewed_at->format('M d, Y h:i A') : null,
                'createdAt' => $req->created_at ? $req->created_at->format('M d, Y') : '',
            ];
        });

        $clients = Client::where('status', 'active')->select('id', 'company_name')->orderBy('id', 'desc')->get();

        $summaryCounts = [
            'pending' => (clone $countsQuery)->where('status', 'pending')->count(),
            'approved' => (clone $countsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $countsQuery)->where('status', 'rejected')->count(),
        ];

        return Inertia::render('Employees/AttendanceCorrectionQueue', [
            'requests' => $mappedRequests,
            'clients' => $clients,
            'summaryCounts' => $summaryCounts,
            'filters' => $request->only(['search', 'client_id', 'status'])
        ]);
    }

    /**
     * Approve an attendance correction request.
     */
    public function approve(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to attendance correction approvals.');
        }

        $req = AttendanceCorrectionRequest::with('employee')->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending correction requests can be approved.');
        }

        if ($user->role === 'manager' && !$user->isManagerForClient($req->employee->client_id)) {
            abort(403, 'Unauthorized access to this client partner.');
        }

        DB::transaction(function () use ($req, $user) {
            $punchIn = Carbon::parse($req->requested_punch_in_time);
            $punchOut = Carbon::parse($req->requested_punch_out_time);
            $minutes = $punchIn->diffInMinutes($punchOut);
            $hoursWorked = round($minutes / 60, 2);

            $status = $hoursWorked >= 8 ? 'present' : 'half_day';
            $dateStr = Carbon::parse($req->attendance_date)->toDateString();

            // Update or create AttendanceRecord
            AttendanceRecord::updateOrCreate(
                [
                    'employee_id' => $req->employee_id,
                    'attendance_date' => $dateStr,
                ],
                [
                    'punch_in_time' => $punchIn,
                    'punch_out_time' => $punchOut,
                    'hours_worked' => $hoursWorked,
                    'status' => $status,
                    'source' => 'override',
                ]
            );

            // Mark correction request approved
            $req->update([
                'status' => 'approved',
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
            ]);
        });

        return redirect()->back()->with('success', "Attendance correction approved for {$req->employee->full_name}. Attendance record updated.");
    }

    /**
     * Reject an attendance correction request.
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to attendance correction approvals.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:5|max:500'
        ]);

        $req = AttendanceCorrectionRequest::with('employee')->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending correction requests can be rejected.');
        }

        if ($user->role === 'manager' && !$user->isManagerForClient($req->employee->client_id)) {
            abort(403, 'Unauthorized access to this client partner.');
        }

        $req->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        return redirect()->back()->with('success', "Attendance correction rejected for {$req->employee->full_name}.");
    }
}
