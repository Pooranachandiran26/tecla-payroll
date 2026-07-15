<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\BankChangeRequest;
use App\Models\Employee;
use App\Models\Client;
use Illuminate\Support\Facades\DB;

class BankChangeRequestController extends Controller
{
    /**
     * Display a paginated listing of bank change requests for Admin/Manager.
     */
    public function index(Request $request)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to bank change requests.');
        }

        $query = BankChangeRequest::with(['employee.client']);

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

        $requests = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        $mappedRequests = $requests->through(function ($req) {
            return [
                'id' => $req->id,
                'empName' => $req->employee ? $req->employee->full_name : 'N/A',
                'empCode' => $req->employee ? $req->employee->employee_code : 'N/A',
                'client' => ($req->employee && $req->employee->client) ? $req->employee->client->company_name : 'N/A',
                'oldBank' => $req->employee ? ($req->employee->bank_name ?? 'N/A') : 'N/A',
                'oldAc' => $req->employee ? ($req->employee->bank_account_number ? '••••••••' . substr($req->employee->bank_account_number, -4) : 'N/A') : 'N/A',
                'newBank' => $req->new_bank_name ?: 'Bank Account',
                'newAc' => $req->new_bank_account_number ? '••••••••' . substr($req->new_bank_account_number, -4) : 'N/A',
                'rawNewAc' => $req->new_bank_account_number,
                'rawNewIfsc' => $req->new_bank_ifsc,
                'rawNewBankName' => $req->new_bank_name,
                'rawNewBranch' => $req->new_bank_branch,
                'rawNewHolder' => $req->new_account_holder_name,
                'reason' => $req->reason,
                'date' => $req->created_at ? $req->created_at->format('F j, Y') : '',
                'status' => $req->status,
                'rejectionReason' => $req->rejection_reason,
            ];
        });

        $clients = Client::where('status', 'active')->select('id', 'company_name')->get();

        return Inertia::render('Employees/BankChangeRequests', [
            'requests' => $mappedRequests,
            'clients' => $clients,
            'filters' => $request->only(['search', 'client_id', 'status'])
        ]);
    }

    /**
     * Submit a bank change request from the Employee Portal.
     */
    public function store(Request $request)
    {
        $employeeId = auth()->user()->employee_id;
        if (!$employeeId) {
            abort(403, 'No employee record linked to your user account.');
        }

        $employee = Employee::findOrFail($employeeId);

        // Check for existing pending request
        $existing = BankChangeRequest::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return redirect()->back()->with('error', 'You already have a pending bank change request under review.');
        }

        $validated = $request->validate([
            'new_bank_account_number' => 'required|string|min:8|max:30|confirmed',
            'new_bank_ifsc' => ['required', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'new_bank_name' => 'nullable|string|max:255',
            'new_bank_branch' => 'nullable|string|max:255',
            'new_account_holder_name' => 'required|string|max:255',
            'reason' => 'required|string|min:5|max:500',
        ]);

        $hash = hash('sha256', $validated['new_bank_account_number']);
        if (Employee::where('bank_account_hash', $hash)->where('id', '!=', $employee->id)->exists()) {
            return redirect()->back()->withErrors(['new_bank_account_number' => 'This bank account is already registered in the system.']);
        }

        BankChangeRequest::create([
            'employee_id' => $employee->id,
            'status' => 'pending',
            'new_bank_account_number' => $validated['new_bank_account_number'],
            'new_bank_ifsc' => strtoupper($validated['new_bank_ifsc']),
            'new_bank_name' => $validated['new_bank_name'] ?? null,
            'new_bank_branch' => $validated['new_bank_branch'] ?? null,
            'new_account_holder_name' => $validated['new_account_holder_name'],
            'reason' => $validated['reason'],
        ]);

        return redirect()->back()->with('success', 'Bank change request submitted successfully and queued for admin approval.');
    }

    /**
     * Approve a bank change request and update employee bank credentials.
     */
    public function approve(Request $request, $id)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to bank change approvals.');
        }

        $req = BankChangeRequest::with('employee')->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending requests can be approved.');
        }

        $hash = hash('sha256', $req->new_bank_account_number);
        if (Employee::where('bank_account_hash', $hash)->where('id', '!=', $req->employee_id)->exists()) {
            return redirect()->back()->with('error', 'Cannot approve: This bank account is already registered to another employee in the system.');
        }

        DB::transaction(function () use ($req, $hash) {
            $req->update([
                'status' => 'approved',
                'processed_by' => auth()->id(),
                'processed_at' => now(),
            ]);

            if ($req->employee) {
                $req->employee->update([
                    'bank_account_number' => $req->new_bank_account_number,
                    'bank_ifsc' => $req->new_bank_ifsc,
                    'bank_name' => $req->new_bank_name ?: $req->employee->bank_name,
                    'bank_branch' => $req->new_bank_branch ?: $req->employee->bank_branch,
                    'account_holder_name' => $req->new_account_holder_name ?: $req->employee->account_holder_name,
                    'bank_account_hash' => $hash,
                ]);
            }
        });

        return redirect()->back()->with('success', "Bank details update approved for {$req->employee->full_name}. Payout records updated.");
    }

    /**
     * Reject a bank change request.
     */
    public function reject(Request $request, $id)
    {
        if (!in_array(auth()->user()->role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized access to bank change approvals.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:5|max:500'
        ]);

        $req = BankChangeRequest::with('employee')->findOrFail($id);

        if ($req->status !== 'pending') {
            return redirect()->back()->with('error', 'Only pending requests can be rejected.');
        }

        $req->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'processed_by' => auth()->id(),
            'processed_at' => now(),
        ]);

        return redirect()->back()->with('success', "Bank details request rejected for {$req->employee->full_name}. Notice sent.");
    }
}
