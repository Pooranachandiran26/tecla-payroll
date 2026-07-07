<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\SalaryRevision;
use App\Services\SalaryCalculationService;
use App\Http\Requests\StoreSalaryRevisionRequest;
use App\Http\Requests\ApproveSalaryRevisionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class SalaryRevisionController extends Controller
{
    public function create($employeeId)
    {
        $employee = Employee::with('client')->findOrFail($employeeId);
        $revisions = SalaryRevision::where('employee_id', $employeeId)
            ->with('approver')
            ->orderBy('created_at', 'desc')
            ->get();

        return inertia('Employees/SalaryRevision', [
            'employee' => $employee,
            'revisions' => $revisions,
        ]);
    }

    public function store(StoreSalaryRevisionRequest $request, $employeeId, SalaryCalculationService $calculator)
    {
        $employee = Employee::findOrFail($employeeId);
        
        $validated = $request->validated();
        
        // Recompute net_take_home and ctc on backend
        $calculationParams = [
            'client_id' => $employee->client_id,
            'pf_applicable' => $employee->pf_applicable,
            'esi_applicable' => $employee->esi_applicable,
            'lwf_applicable' => $employee->lwf_applicable,
            'pt_applicable' => $employee->pt_applicable,
            'basic_pay' => $validated['new_basic_pay'],
            'hra' => $validated['new_hra'],
            'conveyance' => $validated['new_conveyance'],
            'da' => $validated['new_da'],
            'medical_allowance' => $validated['new_medical_allowance'],
            'special_allowance' => $validated['new_special_allowance'],
            'other_additions' => $validated['new_other_additions'],
            'pt_deduction_override' => $employee->pt_deduction_override,
            'gratuity_mode' => $employee->gratuity_mode,
            'bonus_toggle' => $employee->bonus_toggle,
        ];
        
        $calculations = $calculator->calculateStructuralSalary($calculationParams);
        
        SalaryRevision::create([
            'employee_id' => $employee->id,
            'old_basic_pay' => $employee->basic_pay,
            'old_hra' => $employee->hra,
            'old_conveyance' => $employee->conveyance,
            'old_da' => $employee->da,
            'old_medical_allowance' => $employee->medical_allowance,
            'old_special_allowance' => $employee->special_allowance,
            'old_other_additions' => $employee->other_additions,
            'old_net_take_home' => $employee->net_take_home_monthly,
            'old_ctc' => $employee->ctc_monthly,
            
            'new_basic_pay' => $validated['new_basic_pay'],
            'new_hra' => $validated['new_hra'],
            'new_conveyance' => $validated['new_conveyance'],
            'new_da' => $validated['new_da'],
            'new_medical_allowance' => $validated['new_medical_allowance'],
            'new_special_allowance' => $validated['new_special_allowance'],
            'new_other_additions' => $validated['new_other_additions'],
            'new_net_take_home' => $calculations['net_take_home_monthly'],
            'new_ctc' => $calculations['ctc_monthly'],
            
            'effective_date' => $validated['effective_date'],
            'reason_for_revision' => $validated['reason_for_revision'],
            'status' => 'pending_approval',
        ]);

        return redirect()->back()->with('success', 'Salary revision submitted and is pending approval.');
    }

    public function approve(ApproveSalaryRevisionRequest $request, $employeeId, $revisionId)
    {
        $revision = SalaryRevision::where('employee_id', $employeeId)->findOrFail($revisionId);
        
        if ($revision->status !== 'pending_approval') {
            return redirect()->back()->with('error', 'This revision has already been processed.');
        }

        $action = $request->validated('action');
        $rejectionReason = $request->validated('rejection_reason');

        DB::transaction(function () use ($revision, $action, $rejectionReason, $employeeId) {
            if ($action === 'approve') {
                $revision->update([
                    'status' => 'approved',
                    'approved_by' => Auth::id(),
                    'approved_at' => Carbon::now(),
                ]);
                
                // Update employee
                $employee = Employee::findOrFail($employeeId);
                $employee->update([
                    'basic_pay' => $revision->new_basic_pay,
                    'hra' => $revision->new_hra,
                    'conveyance' => $revision->new_conveyance,
                    'da' => $revision->new_da,
                    'medical_allowance' => $revision->new_medical_allowance,
                    'special_allowance' => $revision->new_special_allowance,
                    'other_additions' => $revision->new_other_additions,
                ]);
                
            } else {
                $revision->update([
                    'status' => 'rejected',
                    'approved_by' => Auth::id(), // We store the resolver ID here even if rejected
                    'approved_at' => Carbon::now(),
                    'rejection_reason' => $rejectionReason,
                ]);
            }
        });

        $message = $action === 'approve' ? 'Salary revision approved successfully.' : 'Salary revision rejected.';
        return redirect()->back()->with('success', $message);
    }
}
