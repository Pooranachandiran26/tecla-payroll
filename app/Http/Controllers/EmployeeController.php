<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\SalaryCalculationService;

class EmployeeController extends Controller
{
    public function calculatePreview(Request $request, SalaryCalculationService $calculator)
    {
        $calculations = $calculator->calculateStructuralSalary($request->all());
        return response()->json($calculations);
    }

    public function index(Request $request)
    {
        $query = \App\Models\Employee::with(['client', 'documents']);
        
        if ($request->search) {
            $query->where('employee_code', 'like', "%{$request->search}%")
                  ->orWhere('full_name', 'like', "%{$request->search}%")
                  ->orWhere('uan_number', 'like', "%{$request->search}%");
        }
        
        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->employment_model) {
            $query->where('employment_model', $request->employment_model);
        }

        $employees = $query->paginate(10)->withQueryString();
        
        $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name')->get();
        
        return \Inertia\Inertia::render('Employees/EmployeesList', [
            'employees' => \App\Http\Resources\EmployeeResource::collection($employees),
            'clients' => $clients,
            'filters' => $request->only(['search', 'client_id', 'employment_model', 'status'])
        ]);
    }

    public function store(\App\Http\Requests\StoreEmployeeRequest $request)
    {
        $data = $request->validated();
        
        // Generate employee code (simple incremental for now)
        $lastEmp = \App\Models\Employee::orderBy('id', 'desc')->first();
        $nextId = $lastEmp ? $lastEmp->id + 1 : 1;
        $data['employee_code'] = 'TEC-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
        $data['status'] = 'onboarding';
        
        $clientBranch = \App\Models\ClientBranch::where('client_id', $data['client_id'])->first();
        $data['branch_id'] = $clientBranch ? $clientBranch->id : 1;

        $employee = \App\Models\Employee::create($data);

        return redirect()->route('employees.index')->with('success', 'Employee created successfully.');
    }

    public function edit($id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name')->get();
        return \Inertia\Inertia::render('Employees/EmployeeForm', [
            'clients' => $clients,
            'employee' => $employee
        ]);
    }

    public function show($id)
    {
        $employee = \App\Models\Employee::with(['salaryRevisions.approver', 'client', 'exitRequest', 'documents'])->findOrFail($id);
        return \Inertia\Inertia::render('Employees/EmployeeDetail', [
            'employee' => new \App\Http\Resources\EmployeeResource($employee)
        ]);
    }

    public function update(\App\Http\Requests\UpdateEmployeeRequest $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        
        $employee->update($request->validated());

        return redirect()->back()->with('success', 'Employee updated successfully.');
    }

    public function storeDocument(\App\Http\Requests\StoreEmployeeDocumentRequest $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        
        $path = $request->file('file')->store('employee_documents');
        
        \App\Models\EmployeeDocument::create([
            'employee_id' => $employee->id,
            'document_type' => $request->document_type,
            'file_path' => $path,
            'status' => 'pending'
        ]);

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    public function verifyDocument(\Illuminate\Http\Request $request, $id, $docId)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        \Illuminate\Support\Facades\Gate::authorize('verifyDocuments', $employee);

        $request->validate([
            'status' => 'required|in:verified,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string'
        ]);

        $document = \App\Models\EmployeeDocument::where('employee_id', $employee->id)->findOrFail($docId);
        $document->update([
            'status' => $request->status,
            'rejection_reason' => $request->status === 'rejected' ? $request->rejection_reason : null,
            'verified_by' => auth()->id(),
            'verified_at' => now(),
        ]);

        // Check for auto-activation
        if ($request->status === 'verified' && $employee->status === 'onboarding') {
            $employee->load('documents'); // reload to get latest status
            if ($employee->documents_verified_count >= $employee->documents_required_count) {
                $employee->update(['status' => 'active']);
                
                $auditService = app(\App\Services\AuditService::class);
                $auditService->log(
                    'employee.auto_activated',
                    auth()->user(),
                    $employee,
                    ['status' => 'onboarding'],
                    ['status' => 'active'],
                    ['reason' => 'All required documents verified']
                );
            }
        }

        return redirect()->back()->with('success', 'Document verified successfully.');
    }
}
