<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployeeLoanController extends Controller
{
    public function index(Employee $employee)
    {
        $loans = EmployeeLoan::with('repayments')
            ->where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'loans' => $loans,
            'summary' => [
                'active_count' => $loans->where('status', 'active')->count(),
                'total_principal' => $loans->sum('principal_amount'),
                'total_repaid' => $loans->sum('total_repaid'),
                'total_outstanding' => $loans->sum('remaining_balance'),
                'monthly_emi' => $loans->where('status', 'active')->sum('monthly_emi'),
            ]
        ]);
    }

    public function store(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'loan_type' => 'required|in:salary_advance,company_loan,external_garnishment',
            'principal_amount' => 'required|numeric|min:1',
            'monthly_emi' => 'required|numeric|min:1',
            'start_date' => 'required|date',
            'reason' => 'nullable|string|max:500',
        ]);

        $principal = (float) $validated['principal_amount'];
        $emi = (float) $validated['monthly_emi'];

        if ($emi > $principal) {
            $emi = $principal;
        }

        $year = date('Y', strtotime($validated['start_date']));
        $count = EmployeeLoan::whereYear('created_at', $year)->count() + 1;
        $loanNumber = sprintf('LN-%s-%04d', $year, $count);

        $loan = EmployeeLoan::create([
            'employee_id' => $employee->id,
            'loan_number' => $loanNumber,
            'loan_type' => $validated['loan_type'],
            'principal_amount' => $principal,
            'monthly_emi' => $emi,
            'total_repaid' => 0.00,
            'remaining_balance' => $principal,
            'start_date' => $validated['start_date'],
            'status' => 'active',
            'reason' => $validated['reason'] ?? null,
            'approved_by' => auth()->id(),
        ]);

        return redirect()->back()->with('success', "Loan {$loan->loan_number} created successfully.");
    }

    public function updateStatus(Request $request, EmployeeLoan $loan)
    {
        $validated = $request->validate([
            'status' => 'required|in:active,paused,cancelled,completed',
        ]);

        $loan->update([
            'status' => $validated['status'],
        ]);

        return redirect()->back()->with('success', "Loan {$loan->loan_number} status updated to {$validated['status']}.");
    }
}
