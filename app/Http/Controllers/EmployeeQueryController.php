<?php

namespace App\Http\Controllers;

use App\Models\EmployeeQuery;
use App\Models\Client;
use App\Models\Employee;
use App\Events\EmployeeQuerySubmitted;
use App\Mail\ClientQueryReceivedMail;
use App\Mail\EmployeeQueryRespondedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class EmployeeQueryController extends Controller
{
    public function employeeIndex(Request $request)
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (!$employeeId) {
            $emp = Employee::where('user_id', $user->id)->first();
            $employeeId = $emp ? $emp->id : null;
        }

        $queries = EmployeeQuery::with(['client:id,company_name', 'resolver:id,name'])
            ->where('employee_id', $employeeId)
            ->orderBy('id', 'desc')
            ->get();

        return Inertia::render('EmployeePortal/ContactSupport', [
            'queries' => $queries,
        ]);
    }

    public function employeeStore(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'category' => 'required|in:payroll,attendance,leave,benefits,general',
            'message' => 'required|string|max:2000',
        ]);

        $user = $request->user();
        $employee = Employee::find($user->employee_id);

        if (!$employee) {
            $employee = Employee::where('user_id', $user->id)->first();
        }

        if (!$employee) {
            return back()->with('error', 'Employee record not found for your account.');
        }

        $query = EmployeeQuery::create([
            'employee_id' => $employee->id,
            'client_id' => $employee->client_id,
            'subject' => $request->subject,
            'category' => $request->category,
            'message' => $request->message,
            'status' => 'pending',
        ]);

        // 1. Dispatch watcher notification (Agency Admin / Watchers)
        EmployeeQuerySubmitted::dispatch($query);

        // 2. Defensive check for Client Primary Contact
        $client = Client::find($query->client_id);
        if ($client) {
            $primaryContact = $client->contacts()->where('contact_type', 'primary')->first();
            if ($primaryContact && !empty($primaryContact->email)) {
                try {
                    Mail::to($primaryContact->email)->queue(new ClientQueryReceivedMail($query));
                } catch (\Throwable $e) {
                    Log::warning("Failed to queue ClientQueryReceivedMail for Query #{$query->id}: {$e->getMessage()}");
                }
            } else {
                Log::info("No primary contact found for Client ID {$client->id}; skipping client email notification.");
            }
        }

        return back()->with('success', 'Your query has been submitted successfully. Support team & HR have been notified.');
    }

    public function adminIndex(Request $request)
    {
        $user = $request->user();
        
        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized action.');
        }

        $queryBuilder = EmployeeQuery::with(['employee:id,full_name,employee_code', 'client:id,company_name', 'resolver:id,name']);

        if ($user->role === 'manager') {
            $assignedClientIds = Client::where('account_manager_id', $user->id)
                ->orWhere('backup_account_manager_id', $user->id)
                ->pluck('id')
                ->toArray();

            if (empty($assignedClientIds)) {
                // Manager with zero assigned clients sees 0 queries
                $queryBuilder->whereRaw('1 = 0');
            } else {
                $queryBuilder->whereIn('client_id', $assignedClientIds);
            }
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $queryBuilder->where('status', $request->status);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $queryBuilder->where('category', $request->category);
        }

        $queries = $queryBuilder->orderBy('id', 'desc')->get();
        $pendingCount = EmployeeQuery::where('status', 'pending')->count();

        return Inertia::render('Admin/EmployeeQueries', [
            'queries' => $queries,
            'pendingCount' => $pendingCount,
            'filters' => $request->only(['status', 'category']),
        ]);
    }

    public function adminRespond(Request $request, EmployeeQuery $query)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized action.');
        }

        if ($user->role === 'manager') {
            $assignedClientIds = Client::where('account_manager_id', $user->id)
                ->orWhere('backup_account_manager_id', $user->id)
                ->pluck('id')
                ->toArray();

            if (!in_array($query->client_id, $assignedClientIds)) {
                abort(403, 'Unauthorized access to this query.');
            }
        }

        $request->validate([
            'admin_response' => 'required|string|max:2000',
        ]);

        $query->update([
            'admin_response' => $request->admin_response,
            'status' => 'resolved',
            'resolved_by' => $user->id,
            'resolved_at' => now(),
        ]);

        // Dispatch email notification back to the employee
        $query->load(['employee.user']);
        $employee = $query->employee;
        $userAccount = $employee ? ($employee->user ?: User::where('employee_id', $employee->id)->first()) : null;
        $targetEmail = $employee ? ($employee->personal_email ?: ($userAccount ? $userAccount->email : null)) : null;

        if ($targetEmail) {
            try {
                Mail::to($targetEmail)->queue(new EmployeeQueryRespondedMail($query));
            } catch (\Throwable $e) {
                Log::warning("Failed to queue EmployeeQueryRespondedMail for Query #{$query->id}: {$e->getMessage()}");
            }
        }

        return back()->with('success', 'Response recorded and query resolved successfully.');
    }
}
