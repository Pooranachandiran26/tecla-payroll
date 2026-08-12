<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Services\InvitationService;

class UserController extends Controller
{
    public function __construct(protected InvitationService $invitationService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role === 'manager' && !$user->hasModulePermission('admin_users', 'admin')) {
            abort(403, 'You do not have permission to access User Management.');
        }

        $tab = $request->input('tab', 'system');
        $search = $request->input('search', '');

        $query = User::with([
            'employee:id,full_name,client_id', 
            'employee.client:id,company_name',
            'client:id,company_name',
            'managedClients:id,company_name,client_code'
        ]);

        if ($tab === 'employees') {
            $query->where('role', 'employee');
        } elseif ($tab === 'clients') {
            $query->where('role', 'client');
        } else {
            // Default to system staff
            $query->whereIn('role', ['admin', 'manager']);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->paginate(20)->withQueryString();

        $linkedEmployeeIds = User::whereNotNull('employee_id')->pluck('employee_id');
        $unlinkedEmployees = Employee::whereNotIn('id', $linkedEmployeeIds)
            ->select('id', 'full_name', 'employee_code as code')
            ->orderBy('full_name')
            ->get();

        $linkedClientIds = User::whereNotNull('client_id')->pluck('client_id');
        $unlinkedClients = Client::whereNotIn('id', $linkedClientIds)
            ->select('id', 'company_name', 'client_code as code')
            ->orderBy('company_name')
            ->get();

        $allClients = Client::where('status', 'active')
            ->select('id', 'company_name', 'client_code as code')
            ->orderBy('company_name')
            ->get();

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
            'unlinkedEmployees' => $unlinkedEmployees,
            'unlinkedClients' => $unlinkedClients,
            'allClients' => $allClients,
            'filters' => [
                'tab' => $tab,
                'search' => $search
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,manager,client,employee',
            'employee_id' => 'nullable|exists:employees,id|required_if:role,employee',
            'client_id' => 'nullable|exists:clients,id|required_if:role,client',
            'assigned_client_ids' => 'nullable|array',
            'assigned_client_ids.*' => 'exists:clients,id',
        ]);

        try {
            $user = $this->invitationService->createInvitation($request->only('name', 'email', 'role', 'employee_id', 'client_id'));
            
            if ($user && $user->role === 'manager' && $request->has('assigned_client_ids')) {
                $user->managedClients()->sync($request->input('assigned_client_ids', []));
            }

            return back()->with('success', 'User invited successfully.');
        } catch (\App\Exceptions\InvitationDeliveryException $e) {
            return back()->withErrors(['email' => $e->getMessage()]);
        }
    }

    public function updateManagedClients(Request $request, User $user)
    {
        $request->validate([
            'assigned_client_ids' => 'nullable|array',
            'assigned_client_ids.*' => 'exists:clients,id',
        ]);

        if ($user->role !== 'manager') {
            return back()->withErrors(['message' => 'Client assignment is only applicable for manager role.']);
        }

        $user->managedClients()->sync($request->input('assigned_client_ids', []));

        return back()->with('success', 'Assigned clients updated successfully.');
    }

    public function updateModulePermissions(Request $request, User $user)
    {
        $request->validate([
            'module_permissions' => 'nullable|array',
            'module_permissions.*' => 'string',
        ]);

        if ($user->role !== 'manager') {
            return back()->withErrors(['message' => 'Module permission customization is only applicable for manager role.']);
        }

        $user->update([
            'module_permissions' => $request->input('module_permissions', null),
        ]);

        return back()->with('success', 'Customized module permissions updated successfully.');
    }

    public function resendInvite(Request $request, User $user)
    {
        $currentUser = $request->user();
        if (!$currentUser || !in_array($currentUser->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $this->invitationService->resendInvitation($user);
            return back()->with('success', "Invitation re-sent successfully to {$user->email}.");
        } catch (\App\Exceptions\InvitationDeliveryException $e) {
            return back()->withErrors(['message' => $e->getMessage()]);
        } catch (\Throwable $e) {
            return back()->withErrors(['message' => 'Failed to resend invitation: ' . $e->getMessage()]);
        }
    }

    public function destroy(Request $request, User $user)
    {
        $currentUser = $request->user();
        if (!$currentUser || !in_array($currentUser->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->id === $currentUser->id) {
            return back()->withErrors(['message' => 'You cannot delete your own logged-in admin account.']);
        }

        $userName = $user->name;

        try {
            $user->delete();
            return back()->with('success', "User account '{$userName}' deleted successfully.");
        } catch (\Illuminate\Database\QueryException $e) {
            // Foreign key constraint violation (e.g. attendance uploads, payroll runs, approvals)
            if ($e->getCode() == '23000' || str_contains($e->getMessage(), 'Integrity constraint violation')) {
                // If user has historical audit activity, suspend/deactivate the user to protect audit compliance
                $user->update(['status' => 'suspended']);
                return back()->with('warning', "User account '{$userName}' cannot be permanently deleted because they have associated historical audit records (such as attendance batches or approval logs). The user account has been deactivated & suspended instead.");
            }
            return back()->withErrors(['message' => 'Failed to delete user: ' . $e->getMessage()]);
        } catch (\Throwable $e) {
            return back()->withErrors(['message' => 'An error occurred while deleting user: ' . $e->getMessage()]);
        }
    }
}
