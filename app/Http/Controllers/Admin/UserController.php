<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Services\InvitationService;

class UserController extends Controller
{
    public function __construct(protected InvitationService $invitationService) {}

    public function index()
    {
        $users = User::with(['employee:id,full_name', 'client:id,company_name'])
                     ->orderBy('name')
                     ->get();

        $linkedEmployeeIds = User::whereNotNull('employee_id')->pluck('employee_id');
        $unlinkedEmployees = \App\Models\Employee::whereNotIn('id', $linkedEmployeeIds)
            ->select('id', 'full_name', 'employee_code as code')
            ->orderBy('full_name')
            ->get();

        $linkedClientIds = User::whereNotNull('client_id')->pluck('client_id');
        $unlinkedClients = \App\Models\Client::whereNotIn('id', $linkedClientIds)
            ->select('id', 'company_name', 'client_code as code')
            ->orderBy('company_name')
            ->get();

        return Inertia::render('Admin/UserManagement', [
            'users' => $users,
            'unlinkedEmployees' => $unlinkedEmployees,
            'unlinkedClients' => $unlinkedClients
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
        ]);

        try {
            $this->invitationService->createInvitation($request->only('name', 'email', 'role', 'employee_id', 'client_id'));
            return back()->with('message', 'User invited successfully.');
        } catch (\App\Exceptions\InvitationDeliveryException $e) {
            return back()->withErrors(['email' => $e->getMessage()]);
        }
    }
}
