<?php

namespace App\Http\Controllers;

use App\Models\EmployeeQuery;
use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use App\Events\EmployeeQuerySubmitted;
use App\Mail\ClientQueryReceivedMail;
use App\Mail\EmployeeQueryRespondedMail;
use App\Services\NotificationService;
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

        // 1. Dispatch watcher email notification (Agency Admin / Watchers) — unchanged
        EmployeeQuerySubmitted::dispatch($query);

        // 2. In-app notification for admins & managers (isolated: never breaks submission)
        NotificationService::sendToAdminsAndManagers(
            type: 'employee_query',
            title: 'New Employee Support Query',
            body: "{$employee->full_name} ({$employee->employee_code}) submitted a [{$request->category}] query: {$request->subject}",
            url: route('admin.employee-queries.index', [], false),
            data: ['query_id' => $query->id, 'employee_id' => $employee->id]
        );

        // 3. Defensive check for Client Primary Contact email — unchanged
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

        if ($user->role === 'manager' && !$user->hasModulePermission('emp_queries', 'candidates')) {
            abort(403, 'You do not have permission to access Employee Queries.');
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

        if ($request->filled('client_id') && $request->client_id !== 'all' && $request->client_id !== '') {
            $queryBuilder->where('client_id', $request->client_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $queryBuilder->where('status', $request->status);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $queryBuilder->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $queryBuilder->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%")
                  ->orWhereHas('employee', function ($eq) use ($search) {
                      $eq->where('full_name', 'like', "%{$search}%")
                         ->orWhere('employee_code', 'like', "%{$search}%");
                  })
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('company_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('employee_id')) {
            $queryBuilder->where('employee_id', $request->employee_id);
        }

        if ($request->wantsJson() || $request->header('Accept') === 'application/json') {
            return response()->json([
                'queries' => $queryBuilder->orderBy('id', 'desc')->get()
            ]);
        }

        $queries = $queryBuilder->orderBy('id', 'desc')->get();

        // Calculate counts based on user scoping
        $scopedBase = EmployeeQuery::query();
        if ($user->role === 'manager') {
            $assignedClientIds = Client::where('account_manager_id', $user->id)
                ->orWhere('backup_account_manager_id', $user->id)
                ->pluck('id')->toArray();
            if (empty($assignedClientIds)) {
                $scopedBase->whereRaw('1 = 0');
            } else {
                $scopedBase->whereIn('client_id', $assignedClientIds);
            }
        }

        $stats = [
            'total' => (clone $scopedBase)->count(),
            'pending' => (clone $scopedBase)->where('status', 'pending')->count(),
            'resolved' => (clone $scopedBase)->where('status', 'resolved')->count(),
        ];

        // Fetch client list for filter dropdown
        $clientQuery = Client::select('id', 'company_name')->orderBy('company_name');
        if ($user->role === 'manager') {
            $assignedClientIds = Client::where('account_manager_id', $user->id)
                ->orWhere('backup_account_manager_id', $user->id)
                ->pluck('id')->toArray();
            $clientQuery->whereIn('id', $assignedClientIds);
        }
        $clients = $clientQuery->get();

        return Inertia::render('Admin/EmployeeQueries', [
            'queries' => $queries,
            'stats' => $stats,
            'pendingCount' => $stats['pending'],
            'clients' => $clients,
            'filters' => $request->only(['search', 'client_id', 'status', 'category']),
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
