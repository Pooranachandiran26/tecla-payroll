<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\AttendanceRecord;

class ClientPortalController extends Controller
{
    /**
     * Client Portal Dashboard
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $client = $user->client;

        if (!$client) {
            return Inertia::render('ClientPortal/ClientDashboard', [
                'client' => null,
                'metrics' => [
                    'totalActiveEmployees' => 0,
                    'pendingAttendanceCount' => 0,
                    'totalOutstandingAmount' => 0,
                    'pendingInvoicesCount' => 0,
                ],
                'recentEmployees' => [],
                'recentInvoices' => [],
            ]);
        }

        $clientId = $client->id;

        $totalActiveEmployees = Employee::where('client_id', $clientId)->where('status', 'active')->count();

        $pendingAttendanceCount = AttendanceRecord::whereHas('employee', function($q) use ($clientId) {
            $q->where('client_id', $clientId);
        })->where('status', 'pending')->count();

        $totalOutstandingAmount = (float) Invoice::where('client_id', $clientId)
            ->whereIn('status', ['unpaid', 'overdue', 'partially_paid'])
            ->sum('grand_total');

        $pendingInvoicesCount = Invoice::where('client_id', $clientId)
            ->whereIn('status', ['unpaid', 'overdue'])
            ->count();

        $recentEmployees = Employee::where('client_id', $clientId)
            ->select('id', 'first_name', 'last_name', 'full_name', 'employee_code', 'designation', 'status', 'gender', 'created_at')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        $recentInvoices = Invoice::where('client_id', $clientId)
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        $safeClientData = $client->only([
            'id', 'company_name', 'client_code', 'industry', 'contract_type', 'status',
            'primary_poc_name', 'primary_poc_email', 'primary_poc_phone'
        ]);

        return Inertia::render('ClientPortal/ClientDashboard', [
            'client' => $safeClientData,
            'metrics' => [
                'totalActiveEmployees' => $totalActiveEmployees,
                'pendingAttendanceCount' => $pendingAttendanceCount,
                'totalOutstandingAmount' => $totalOutstandingAmount,
                'pendingInvoicesCount' => $pendingInvoicesCount,
            ],
            'recentEmployees' => $recentEmployees,
            'recentInvoices' => $recentInvoices,
        ]);
    }

    /**
     * Client Portal Employees / Candidates Directory
     */
    public function employees(Request $request)
    {
        $user = $request->user();
        $client = $user->client;

        $query = Employee::query();
        if ($client) {
            $query->where('client_id', $client->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search = $request->input('search')) {
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $employees = $query->orderBy('id', 'desc')->paginate(15)->withQueryString();

        return Inertia::render('ClientPortal/ClientCandidates', [
            'client' => $client ? $client->only(['id', 'company_name', 'client_code']) : null,
            'employees' => $employees,
            'filters' => $request->only(['search', 'status'])
        ]);
    }

    /**
     * Client Portal Attendance Approvals
     */
    public function attendance(Request $request)
    {
        $user = $request->user();
        $client = $user->client;

        $query = AttendanceRecord::with('employee:id,first_name,last_name,full_name,employee_code');
        if ($client) {
            $clientId = $client->id;
            $query->whereHas('employee', function($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($search = $request->input('search')) {
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('attendance_date', 'desc')->paginate(20)->withQueryString();

        return Inertia::render('ClientPortal/ClientAttendanceApproval', [
            'client' => $client ? $client->only(['id', 'company_name', 'client_code']) : null,
            'attendanceRecords' => $records,
            'filters' => $request->only(['search'])
        ]);
    }

    /**
     * Client Portal Invoices
     */
    public function invoices(Request $request)
    {
        $user = $request->user();
        $client = $user->client;

        $query = Invoice::query();
        if ($client) {
            $query->where('client_id', $client->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        $invoices = $query->orderBy('id', 'desc')->paginate(15)->withQueryString();

        return Inertia::render('ClientPortal/ClientInvoices', [
            'client' => $client ? $client->only(['id', 'company_name', 'client_code']) : null,
            'invoices' => $invoices
        ]);
    }

    /**
     * Client Portal Company Profile
     */
    public function show()
    {
        $client = auth()->user()->client;
        
        $safeClientData = $client ? $client->only([
            'id', 'company_name', 'client_code', 'industry', 'contract_type', 'status',
            'primary_poc_name', 'primary_poc_email', 'primary_poc_phone',
            'company_type', 'country', 'registered_city', 'registered_state',
            'contract_start_date', 'contract_end_date'
        ]) : null;

        return Inertia::render('ClientPortal/ClientProfile', [
            'client' => $safeClientData
        ]);
    }

    /**
     * Client Portal Dedicated Leave Settings (Shows ONLY this client's policies and employees)
     */
    public function leaveSettings(Request $request)
    {
        $user = $request->user();
        $client = $user->client;

        if (!$client) {
            return Inertia::render('ClientPortal/ClientLeaveSettings', [
                'client' => null,
                'policies' => [],
                'balances' => [],
                'currentYear' => (int)date('Y'),
            ]);
        }

        $leavePolicyService = app(\App\Services\LeavePolicyService::class);
        if (\App\Models\ClientLeavePolicy::where('client_id', $client->id)->count() === 0) {
            $leavePolicyService->seedDefaultPolicies($client);
            $leavePolicyService->syncClientEmployeesBalances($client, (int)date('Y'));
        }

        $policies = \App\Models\ClientLeavePolicy::where('client_id', $client->id)
            ->orderBy('id', 'asc')
            ->get();

        $balances = \App\Models\EmployeeLeaveBalance::with(['employee:id,first_name,last_name,employee_code', 'policy:id,policy_name,leave_type'])
            ->whereHas('policy', function ($q) use ($client) {
                $q->where('client_id', $client->id);
            })
            ->where('year', (int)date('Y'))
            ->get();

        return Inertia::render('ClientPortal/ClientLeaveSettings', [
            'client' => $client->only(['id', 'company_name', 'client_code']),
            'policies' => $policies,
            'balances' => $balances,
            'currentYear' => (int)date('Y'),
        ]);
    }
}
