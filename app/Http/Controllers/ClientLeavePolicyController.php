<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientLeavePolicy;
use App\Models\EmployeeLeaveBalance;
use App\Services\LeavePolicyService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientLeavePolicyController extends Controller
{
    protected LeavePolicyService $leavePolicyService;

    public function __construct(LeavePolicyService $leavePolicyService)
    {
        $this->leavePolicyService = $leavePolicyService;
    }

    /**
     * Display leave policies and employee balances for managed clients.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Determine allowed client IDs
        $clientsQuery = Client::orderBy('company_name', 'asc');

        if ($user->role === 'manager') {
            $managedIds = $user->getManagedClientIds();
            $clientsQuery->whereIn('id', $managedIds);
            $clients = $clientsQuery->get(['id', 'company_name', 'client_code']);
            $selectedClientId = $request->input('client_id', $clients->first()?->id);
        } elseif ($user->role === 'client') {
            $clientsQuery->where('id', $user->client_id);
            $clients = $clientsQuery->get(['id', 'company_name', 'client_code']);
            $selectedClientId = (int)$user->client_id;
        } else {
            $clients = $clientsQuery->get(['id', 'company_name', 'client_code']);
            $selectedClientId = $request->input('client_id', $clients->first()?->id);
        }

        // Security check for selected client
        if ($selectedClientId) {
            $this->authorizeClientAccess($user, (int)$selectedClientId);
        }

        $policies = [];
        $balances = [];

        if ($selectedClientId) {
            $client = Client::find($selectedClientId);
            if ($client) {
                // Ensure default policies exist
                if (ClientLeavePolicy::where('client_id', $client->id)->count() === 0) {
                    $this->leavePolicyService->seedDefaultPolicies($client);
                    $this->leavePolicyService->syncClientEmployeesBalances($client, (int)date('Y'));
                }

                $policies = ClientLeavePolicy::where('client_id', $client->id)
                    ->orderBy('id', 'asc')
                    ->get();

                $balances = EmployeeLeaveBalance::with(['employee:id,first_name,last_name,employee_code', 'policy:id,policy_name,leave_type'])
                    ->whereHas('policy', function ($q) use ($client) {
                        $q->where('client_id', $client->id);
                    })
                    ->where('year', (int)date('Y'))
                    ->get();
            }
        }

        return Inertia::render('Payroll/LeaveSettings', [
            'clients' => $clients,
            'selectedClientId' => (int)$selectedClientId,
            'policies' => $policies,
            'balances' => $balances,
            'currentYear' => (int)date('Y'),
        ]);
    }

    /**
     * Store a new or updated leave policy.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'leave_type' => 'required|string|max:50',
            'policy_name' => 'required|string|max:100',
            'annual_quota' => 'required|numeric|min:0|max:365',
            'accrual_frequency' => 'required|in:monthly,annual_upfront,quarterly',
            'monthly_accrual_rate' => 'nullable|numeric|min:0|max:30',
            'max_days_per_month' => 'nullable|numeric|min:0|max:30',
            'carry_forward_allowed' => 'required|boolean',
            'max_carry_forward_days' => 'required|numeric|min:0|max:365',
        ]);

        $this->authorizeClientAccess($user, (int)$validated['client_id']);

        $client = Client::findOrFail($validated['client_id']);

        $monthlyRate = isset($validated['monthly_accrual_rate']) && (float)$validated['monthly_accrual_rate'] > 0
            ? (float)$validated['monthly_accrual_rate']
            : (strtolower($validated['accrual_frequency']) === 'monthly' ? round($validated['annual_quota'] / 12, 2) : 0);

        $maxDaysPerMonth = isset($validated['max_days_per_month']) && $validated['max_days_per_month'] !== '' && (float)$validated['max_days_per_month'] > 0
            ? (float)$validated['max_days_per_month']
            : null;

        $policy = ClientLeavePolicy::updateOrCreate(
            [
                'client_id' => $validated['client_id'],
                'leave_type' => strtolower($validated['leave_type']),
            ],
            [
                'policy_name' => $validated['policy_name'],
                'annual_quota' => $validated['annual_quota'],
                'accrual_frequency' => $validated['accrual_frequency'],
                'monthly_accrual_rate' => $monthlyRate,
                'max_days_per_month' => $maxDaysPerMonth,
                'carry_forward_allowed' => $validated['carry_forward_allowed'],
                'max_carry_forward_days' => $validated['carry_forward_allowed'] ? $validated['max_carry_forward_days'] : 0,
                'is_active' => true,
            ]
        );

        $this->leavePolicyService->syncClientEmployeesBalances($client, (int)date('Y'));

        return redirect()->back()->with('success', "Leave policy '{$policy->policy_name}' configured successfully and balances synced.");
    }

    /**
     * Update an existing policy.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $policy = ClientLeavePolicy::findOrFail($id);

        $this->authorizeClientAccess($user, (int)$policy->client_id);

        $validated = $request->validate([
            'policy_name' => 'required|string|max:100',
            'annual_quota' => 'required|numeric|min:0|max:365',
            'accrual_frequency' => 'required|in:monthly,annual_upfront,quarterly',
            'monthly_accrual_rate' => 'nullable|numeric|min:0|max:30',
            'max_days_per_month' => 'nullable|numeric|min:0|max:30',
            'carry_forward_allowed' => 'required|boolean',
            'max_carry_forward_days' => 'required|numeric|min:0|max:365',
        ]);

        $oldMaxCarryForward = (float)$policy->max_carry_forward_days;

        $monthlyRate = isset($validated['monthly_accrual_rate']) && (float)$validated['monthly_accrual_rate'] > 0
            ? (float)$validated['monthly_accrual_rate']
            : (strtolower($validated['accrual_frequency']) === 'monthly' ? round($validated['annual_quota'] / 12, 2) : 0);

        $maxDaysPerMonth = isset($validated['max_days_per_month']) && $validated['max_days_per_month'] !== '' && (float)$validated['max_days_per_month'] > 0
            ? (float)$validated['max_days_per_month']
            : null;

        $policy->update([
            'policy_name' => $validated['policy_name'],
            'annual_quota' => $validated['annual_quota'],
            'accrual_frequency' => $validated['accrual_frequency'],
            'monthly_accrual_rate' => $monthlyRate,
            'max_days_per_month' => $maxDaysPerMonth,
            'carry_forward_allowed' => $validated['carry_forward_allowed'],
            'max_carry_forward_days' => $validated['carry_forward_allowed'] ? $validated['max_carry_forward_days'] : 0,
        ]);

        $client = Client::findOrFail($policy->client_id);
        $this->leavePolicyService->syncClientEmployeesBalances($client, (int)date('Y'));

        $warning = null;
        if ($oldMaxCarryForward > (float)$policy->max_carry_forward_days) {
            $warning = "⚠️ Policy updated. Note: Lowering max carry-forward days applies from the NEXT leave year. Current year earned days remain protected under their year-start snapshot.";
        }

        return redirect()->back()->with($warning ? 'warning' : 'success', $warning ?? "Policy '{$policy->policy_name}' updated successfully.");
    }

    /**
     * Trigger manual sync of employee leave balances.
     */
    public function syncAllEmployees(Request $request, $clientId)
    {
        $user = $request->user();
        $this->authorizeClientAccess($user, (int)$clientId);

        $client = Client::findOrFail($clientId);
        $this->leavePolicyService->syncClientEmployeesBalances($client, (int)date('Y'));

        return redirect()->back()->with('success', "All employee leave balances synced for {$client->company_name}.");
    }

    /**
     * Authorize user access to a client ID.
     */
    protected function authorizeClientAccess($user, int $clientId): void
    {
        if ($user->role === 'admin') {
            return;
        }

        if ($user->role === 'manager') {
            $managedIds = $user->getManagedClientIds();
            if (!in_array($clientId, $managedIds)) {
                abort(403, 'Unauthorized access to client leave settings.');
            }
            return;
        }

        if ($user->role === 'client') {
            if ((int)$user->client_id !== $clientId) {
                abort(403, 'Unauthorized access to client leave settings.');
            }
            return;
        }

        abort(403, 'Unauthorized action.');
    }
}
