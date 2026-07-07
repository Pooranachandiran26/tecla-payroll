<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\EmployeeExit;
use App\Services\FullAndFinalCalculationService;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class EmployeeExitController extends Controller
{
    public function show($id)
    {
        $employee = Employee::with('client')->findOrFail($id);
        $exitData = $employee->exitRequest;

        return \Inertia\Inertia::render('Employees/EmployeeExit', [
            'employee' => new \App\Http\Resources\EmployeeResource($employee),
            'initialExitData' => $exitData
        ]);
    }

    public function previewSettlement(Request $request, $id, FullAndFinalCalculationService $calculator)
    {
        $employee = Employee::findOrFail($id);
        $calculations = $calculator->calculatePreview($employee, $request->all());
        return response()->json($calculations);
    }

    public function storeStage(Request $request, $id, $stage, FullAndFinalCalculationService $calcService)
    {
        $employee = Employee::findOrFail($id);
        $exitRequest = EmployeeExit::where('employee_id', $id)->latest('id')->first();
        if (!$exitRequest) {
            $exitRequest = EmployeeExit::create(['employee_id' => $id]);
        }

        if ($exitRequest->current_stage < $stage && $stage <= 5) {
            $exitRequest->current_stage = (int)$stage;
        }

        switch ($stage) {
            case 1: // Initiate
                $validated = $request->validate([
                    'exit_type' => 'required|string',
                    'reason_category' => 'required|string',
                    'submission_date' => 'required|date',
                    'discussed_with_employee' => 'boolean',
                    'discussion_summary' => 'nullable|string'
                ]);
                $exitRequest->update($validated);
                break;
            case 2: // Notice
                $validated = $request->validate([
                    'last_working_day' => 'required|date',
                    'notice_shortfall_days' => 'numeric',
                    'notice_amount_type' => 'in:addition,deduction,none'
                ]);
                
                $lwd = Carbon::parse($validated['last_working_day']);
                if ($calculator->isPayrollLocked($lwd->month, $lwd->year)) {
                    throw ValidationException::withMessages([
                        'last_working_day' => 'Cannot exit an employee with a last working day that falls in a month where payroll is already locked.'
                    ]);
                }
                
                $exitRequest->update($validated);
                break;
            case 3: // Clearance
                $validated = $request->validate([
                    'clearance_laptop' => 'in:yes,no,na',
                    'clearance_idcard' => 'in:yes,no,na',
                    'clearance_manager' => 'in:yes,no,na',
                    'clearance_itaccess' => 'in:yes,no,na',
                    'clearance_handover' => 'in:yes,no,na',
                    'clearance_client' => 'in:yes,no,na',
                ]);
                $exitRequest->update($validated);
                break;
            case 4: // Interview
                $validated = $request->validate([
                    'interview_reason' => 'nullable|string',
                    'would_recommend' => 'nullable|in:yes,no',
                    'star_rating' => 'nullable|integer|min:1|max:5',
                ]);
                $exitRequest->update($validated);
                break;
            case 5: // Settlement
                $data = $request->all();
                $calculations = $calcService->calculatePreview($employee, $data);
                
                $calculations['unused_leaves'] = (int) ($data['unused_leaves'] ?? 0);
                $calculations['adhoc_adjustments'] = $data['adhoc_adjustments'] ?? [];
                $calculations['settlement_status'] = $data['is_submitting_for_approval'] ? 'pending_approval' : 'draft';
                if ($data['is_submitting_for_approval']) {
                     $exitRequest->current_stage = 6;
                }
                
                $exitRequest->update($calculations);
                break;
        }

        return response()->json(['message' => 'Stage saved successfully', 'exitData' => $exitRequest]);
    }

    public function approve(Request $request, $id)
    {
        $user = auth()->user();
        if ($user->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $employee = Employee::findOrFail($id);
        $exitRequest = EmployeeExit::where('employee_id', $id)->latest('id')->firstOrFail();

        $exitRequest->update([
            'settlement_status' => 'approved'
        ]);

        return response()->json(['message' => 'Settlement approved']);
    }

    public function confirm(Request $request, $id)
    {
        $user = auth()->user();
        if ($user->role !== 'admin') {
            abort(403, 'Unauthorized action.');
        }

        $employee = Employee::findOrFail($id);
        $exitRequest = EmployeeExit::where('employee_id', $id)->latest('id')->firstOrFail();

        $exitRequest->update([
            'current_stage' => 6,
            'confirmed_at' => now(),
            'confirmed_by' => $user->id
        ]);

        $employee->update([
            'status' => 'exited'
        ]);

        return response()->json(['message' => 'Exit confirmed and employee status updated to exited']);
    }
}
