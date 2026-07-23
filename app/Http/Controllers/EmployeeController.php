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

        $employees = $query->orderBy('id', 'desc')->paginate(10)->withQueryString();
        
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
        
        $employee = \DB::transaction(function () use ($data) {
            $attempts = 0;
            $maxAttempts = 5;
            
            while ($attempts < $maxAttempts) {
                try {
                    // Lock the last employee record to prevent concurrent ID selection collision
                    $lastEmp = \App\Models\Employee::lockForUpdate()->orderBy('id', 'desc')->first();
                    $nextId = $lastEmp ? $lastEmp->id + 1 : 1;
                    
                    $data['employee_code'] = 'TEC-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
                    $data['status'] = 'onboarding';
                    
                    $clientBranch = \App\Models\ClientBranch::where('client_id', $data['client_id'])->first();
                    $data['branch_id'] = $clientBranch ? $clientBranch->id : 1;

                    return \App\Models\Employee::create($data);
                } catch (\Illuminate\Database\QueryException $e) {
                    if ($e->getCode() == 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                        $attempts++;
                        if ($attempts >= $maxAttempts) {
                            throw $e;
                        }
                        usleep(100000); // Wait 100ms before retrying
                        continue;
                    }
                    throw $e;
                }
            }
        });

        try {
            if (!\App\Models\User::where('employee_id', $employee->id)->exists()) {
                $invitationService = app(\App\Services\InvitationService::class);
                $invitationService->createInvitation([
                    'name' => $employee->full_name,
                    'email' => $employee->personal_email,
                    'role' => 'employee',
                    'employee_id' => $employee->id,
                ]);
            }
        } catch (\Illuminate\Database\QueryException $e) {
            \Illuminate\Support\Facades\Log::error("Failed to provision user for employee {$employee->id} (QueryException): " . $e->getMessage());
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Failed to provision user for employee {$employee->id}: " . $e->getMessage());
        }

        \App\Jobs\NotifyWatchersJob::dispatch(
            'system_alerts',
            'New Employee Registered',
            "Employee {$employee->full_name} ({$employee->employee_code}) has been added to the system.",
            null
        );

        return redirect()->route('employees.index')->with('success', 'Employee created successfully.');
    }

    public function resendInvitation($id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        $user = \App\Models\User::where('employee_id', $employee->id)->first();

        if (!$user) {
            return redirect()->back()->with('error', 'No user account found for this employee.');
        }

        if ($user->status !== 'invited') {
            abort(403, 'Cannot resend invitation to an active user.');
        }

        try {
            $invitationService = app(\App\Services\InvitationService::class);
            $invitationService->resendInvitation($user);
            return redirect()->back()->with('success', 'Invitation resent successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to resend invitation: ' . $e->getMessage());
        }
    }

    public function edit($id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        $clients = \App\Models\Client::where('status', 'active')->select('id', 'company_name', 'weekly_off_pattern')->get();
        return \Inertia\Inertia::render('Employees/EmployeeForm', [
            'clients' => $clients,
            'employee' => $employee
        ]);
    }

    public function show(\Illuminate\Http\Request $request, $id)
    {
        $employee = \App\Models\Employee::with(['salaryRevisions.approver', 'client', 'exitRequest', 'documents'])->findOrFail($id);
        
        $targetDate = $request->query('month') ? \Carbon\Carbon::parse($request->query('month').'-01') : now();
        $monthStart = $targetDate->copy()->startOfMonth()->toDateString();
        $monthEnd = $targetDate->copy()->endOfMonth()->toDateString();
        
        $attendanceRecords = \App\Models\AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->orderBy('attendance_date', 'asc')
            ->get();

        $stats = [
            'present' => $attendanceRecords->where('status', 'present')->count(),
            'leave' => $attendanceRecords->where('status', 'leave')->count(),
            'absent' => $attendanceRecords->where('status', 'absent')->count(),
            'targetMonth' => $targetDate->format('Y-m'),
            'targetMonthDisplay' => $targetDate->format('F Y'),
            'daysInMonth' => $targetDate->daysInMonth,
            'startDayOfWeek' => $targetDate->copy()->startOfMonth()->dayOfWeekIso, // 1 (Mon) - 7 (Sun)
        ];

        $tdsService = app(\App\Services\TdsCalculationService::class);
        $fy = $tdsService->determineFinancialYear($targetDate->toDateString());
        $taxDeclaration = \App\Models\EmployeeTaxDeclaration::where('employee_id', $employee->id)
            ->where('financial_year', $fy)
            ->first();

        $newRegimeTax = $tdsService->calculateAnnualTax($employee, $fy, $taxDeclaration ? clone $taxDeclaration : null);
        $tempOldDec = $taxDeclaration ? clone $taxDeclaration : new \App\Models\EmployeeTaxDeclaration(['regime' => 'old']);
        $tempOldDec->regime = 'old';
        $oldRegimeTax = $tdsService->calculateAnnualTax($employee, $fy, $tempOldDec);

        $taxComparison = [
            'financial_year' => $fy,
            'new_regime' => $newRegimeTax,
            'old_regime' => $oldRegimeTax,
            'recommended_regime' => ($newRegimeTax['net_tax_payable'] <= $oldRegimeTax['net_tax_payable']) ? 'new' : 'old',
            'annual_tax_savings' => abs($newRegimeTax['net_tax_payable'] - $oldRegimeTax['net_tax_payable']),
        ];

        $loans = \App\Models\EmployeeLoan::with('repayments')
            ->where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return \Inertia\Inertia::render('Employees/EmployeeDetail', [
            'employee' => new \App\Http\Resources\EmployeeResource($employee),
            'attendanceRecords' => $attendanceRecords,
            'attendanceStats' => $stats,
            'taxDeclaration' => $taxDeclaration,
            'taxComparison' => $taxComparison,
            'loans' => $loans,
        ]);
    }

    public function update(\App\Http\Requests\UpdateEmployeeRequest $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        
        $employee->update($request->validated());

        return redirect()->route('employees.index')->with('success', 'Employee updated successfully.');
    }

    public function storeDocument(\App\Http\Requests\StoreEmployeeDocumentRequest $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        
        // Find existing document of the same type and delete it (including file)
        $existing = \App\Models\EmployeeDocument::where('employee_id', $employee->id)
            ->where('document_type', $request->document_type)
            ->first();
            
        if ($existing) {
            \Illuminate\Support\Facades\Storage::delete($existing->file_path);
            $existing->delete();
        }

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

        if ($request->status === 'verified' && $employee->personal_email) {
            \Illuminate\Support\Facades\Mail::to($employee->personal_email)
                ->queue(new \App\Mail\DocumentVerifiedMail($document->document_type, $employee->full_name));
        } elseif ($request->status === 'rejected' && $employee->personal_email) {
            \Illuminate\Support\Facades\Mail::to($employee->personal_email)
                ->queue(new \App\Mail\DocumentRejectedMail($document->document_type, $employee->full_name, $request->rejection_reason));
        }

        // Check for auto-activation
        if ($request->status === 'verified' && $employee->status === 'onboarding') {
            $employee->load('documents'); // reload to get latest status
            if ($employee->documents_verified_count >= $employee->documents_required_count) {
                $employee->update(['status' => 'active']);
                
                if ($employee->personal_email) {
                    \Illuminate\Support\Facades\Mail::to($employee->personal_email)
                        ->queue(new \App\Mail\ProfileActivatedMail($employee->full_name));
                }

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

    public function viewDocument($id, $docId)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        \Illuminate\Support\Facades\Gate::authorize('viewDocuments', $employee);

        $document = \App\Models\EmployeeDocument::where('employee_id', $employee->id)->findOrFail($docId);

        if (!\Illuminate\Support\Facades\Storage::disk('local')->exists($document->file_path)) {
            abort(404, 'Document file not found.');
        }

        return \Illuminate\Support\Facades\Storage::disk('local')->response(
            $document->file_path,
            null,
            ['Content-Disposition' => 'inline']
        );
    }

    public function destroy(Request $request, $id)
    {
        $employee = \App\Models\Employee::withTrashed()->findOrFail($id);
        \Illuminate\Support\Facades\Gate::authorize('delete', $employee);

        $request->validate([
            'confirm_text' => 'required|in:DELETE',
            'reason' => 'required|string|min:10'
        ]);

        // BLOCKING CHECK 1: Pending or incomplete exit
        $inProgressExit = $employee->exitRequest()->where(function($q) {
            $q->where('settlement_status', 'pending_approval')
              ->orWhere('current_stage', '<', 6);
        })->exists();

        if ($inProgressExit) {
            return redirect()->back()->with('error', 'Cannot delete: this employee has an in-progress exit. Complete or cancel it first.');
        }

        // BLOCKING CHECK 2: Payroll locked check
        $calcService = new \App\Services\FullAndFinalCalculationService();
        if ($calcService->isPayrollLocked($employee)) {
            return redirect()->back()->with('error', 'Cannot delete: this employee has locked payroll records.');
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($employee, $request) {
            // Soft delete relations via Eloquent to trigger their soft deletes if any events existed
            // (even without events, explicitly iterating is safer per requirements)
            $employee->documents->each(fn($m) => $m->delete());
            $employee->salaryRevisions->each(fn($m) => $m->delete());
            if ($employee->exitRequest) {
                $employee->exitRequest->delete();
            }
            // If BankChangeRequest existed, we'd delete it here, but it's not a standard relation on the model yet
            try {
                \App\Models\BankChangeRequest::where('employee_id', $employee->id)->get()->each(fn($m) => $m->delete());
            } catch (\Illuminate\Database\QueryException $e) {
                // Table is currently a stub without employee_id column, ignore for now
            }

            $employee->delete();

            // Suspend active linked users
            $linkedUser = \App\Models\User::where('employee_id', $employee->id)->where('status', 'active')->first();
            if ($linkedUser) {
                $linkedUser->update([
                    'status' => 'suspended',
                    'suspended_reason' => 'employee_deleted'
                ]);
            }
        });

        $auditService = app(\App\Services\AuditService::class);
        $auditService->log(
            'employee.deleted',
            auth()->user(),
            $employee,
            null,
            ['reason' => $request->reason]
        );

        return redirect()->route('employees.index')->with('success', 'Employee deleted successfully.');
    }

    public function deactivate(Request $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        \Illuminate\Support\Facades\DB::transaction(function () use ($employee) {
            $employee->update(['status' => 'suspended']);

            $linkedUser = \App\Models\User::where('employee_id', $employee->id)->where('status', 'active')->first();
            if ($linkedUser) {
                $linkedUser->update([
                    'status' => 'suspended',
                    'suspended_reason' => 'employee_suspended'
                ]);
            }
        });

        $auditService = app(\App\Services\AuditService::class);
        $auditService->log(
            'employee.deactivated',
            auth()->user(),
            $employee,
            null,
            null
        );

        return redirect()->back()->with('success', 'Employee deactivated successfully.');
    }

    public function activate(Request $request, $id)
    {
        $employee = \App\Models\Employee::findOrFail($id);
        \Illuminate\Support\Facades\DB::transaction(function () use ($employee) {
            $employee->update(['status' => 'active']);

            $linkedUser = \App\Models\User::where('employee_id', $employee->id)
                ->where('status', 'suspended')
                ->where('suspended_reason', 'employee_suspended')
                ->first();
                
            if ($linkedUser) {
                $linkedUser->update([
                    'status' => 'active',
                    'suspended_reason' => null
                ]);
            }
        });

        $auditService = app(\App\Services\AuditService::class);
        $auditService->log(
            'employee.activated',
            auth()->user(),
            $employee,
            null,
            null
        );

        return redirect()->back()->with('success', 'Employee activated successfully.');
    }

    public function restore(Request $request, $id)
    {
        $employee = \App\Models\Employee::withTrashed()->findOrFail($id);
        \Illuminate\Support\Facades\Gate::authorize('restore', $employee);

        \Illuminate\Support\Facades\DB::transaction(function () use ($employee) {
            $employee->restore();

            \App\Models\EmployeeDocument::withTrashed()->where('employee_id', $employee->id)->get()->each(fn($m) => $m->restore());
            \App\Models\SalaryRevision::withTrashed()->where('employee_id', $employee->id)->get()->each(fn($m) => $m->restore());
            \App\Models\EmployeeExit::withTrashed()->where('employee_id', $employee->id)->get()->each(fn($m) => $m->restore());
            \App\Models\BankChangeRequest::withTrashed()->where('employee_id', $employee->id)->get()->each(fn($m) => $m->restore());

            $linkedUser = \App\Models\User::where('employee_id', $employee->id)
                ->where('status', 'suspended')
                ->where('suspended_reason', 'employee_deleted')
                ->first();
                
            if ($linkedUser) {
                $linkedUser->update([
                    'status' => 'active',
                    'suspended_reason' => null
                ]);
            }
        });

        $auditService = app(\App\Services\AuditService::class);
        $auditService->log(
            'employee.restored',
            auth()->user(),
            $employee,
            null,
            null
        );

        return redirect()->back()->with('success', 'Employee restored successfully.');
    }

    /**
     * Check field uniqueness for live frontend UX validation.
     * Strictly masks identifying data to prevent privacy leaks.
     */
    public function checkUnique(Request $request)
    {
        $validated = $request->validate([
            'field' => 'required|in:personal_email,phone_number',
            'value' => 'required|string',
            'ignore_id' => 'nullable|integer',
        ]);

        $field = $validated['field'];
        $value = trim($validated['value']);
        $ignoreId = $validated['ignore_id'] ?? null;

        if ($field === 'personal_email') {
            $employeeQuery = \App\Models\Employee::where('personal_email', $value);
            if ($ignoreId) {
                $employeeQuery->where('id', '!=', $ignoreId);
            }
            $existsInEmployees = $employeeQuery->exists();

            $userQuery = \App\Models\User::where('email', $value);
            if ($ignoreId) {
                $userQuery->where(function ($q) use ($ignoreId) {
                    $q->whereNull('employee_id')
                      ->orWhere('employee_id', '!=', $ignoreId);
                });
            }
            $existsInUsers = $userQuery->exists();

            if ($existsInEmployees || $existsInUsers) {
                return response()->json([
                    'available' => false,
                    'message' => 'This email address is already registered in the system.'
                ]);
            }
        } elseif ($field === 'phone_number') {
            $employeeQuery = \App\Models\Employee::where('phone_number', $value);
            if ($ignoreId) {
                $employeeQuery->where('id', '!=', $ignoreId);
            }
            if ($employeeQuery->exists()) {
                return response()->json([
                    'available' => false,
                    'message' => 'This phone number is already registered in the system.'
                ]);
            }
        }

        return response()->json([
            'available' => true,
            'message' => null,
        ]);
    }
}

