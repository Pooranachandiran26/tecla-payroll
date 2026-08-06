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

use Illuminate\Support\Facades\Mail;
use App\Mail\PromotionRevisionApprovedMail;
use App\Services\NotificationService;


class SalaryRevisionController extends Controller
{
    public function create($employeeId)
    {
        $user = request()->user();
        if ($user && $user->role === 'manager' && !$user->hasModulePermission('emp_salary_revisions', 'candidates')) {
            abort(403, 'You do not have permission to access Salary Revisions.');
        }

        $employee = Employee::with('client')->findOrFail($employeeId);
        $revisions = SalaryRevision::where('employee_id', $employeeId)
            ->with('approver')
            ->orderBy('created_at', 'desc')
            ->get();

        return inertia('Employees/SalaryRevision', [
            'employee' => (new \App\Http\Resources\EmployeeResource($employee))->resolve(),
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
            'eps_applicable' => $employee->eps_applicable,
            'date_of_birth' => $employee->date_of_birth,
            'gender' => $employee->gender,
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
        
        $isPromotion = (bool)($validated['is_promotion'] ?? false);
        $oldDesignation = $isPromotion ? $employee->designation : null;
        $newDesignation = $isPromotion ? ($validated['new_designation'] ?? null) : null;
        
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
            'is_promotion' => $isPromotion,
            'old_designation' => $oldDesignation,
            'new_designation' => $newDesignation,
            'status' => 'pending_approval',
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        // Notify all admins in-app (isolated: failure here never breaks the revision submission)
        NotificationService::sendToAdmins(
            type: 'salary_revision',
            title: 'Salary Revision Pending Approval',
            body: "{$employee->full_name} ({$employee->employee_code}) has submitted a salary revision request.",
            url: route('employees.salary-revision.create', $employee->id, false),
            data: ['employee_id' => $employee->id]
        );

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
                    'updated_by' => Auth::id(),
                ]);
                
                // Update employee
                $employee = Employee::findOrFail($employeeId);
                $employeeData = [
                    'basic_pay' => $revision->new_basic_pay,
                    'hra' => $revision->new_hra,
                    'conveyance' => $revision->new_conveyance,
                    'da' => $revision->new_da,
                    'medical_allowance' => $revision->new_medical_allowance,
                    'special_allowance' => $revision->new_special_allowance,
                    'other_additions' => $revision->new_other_additions,
                ];

                if ($revision->is_promotion && !empty($revision->new_designation)) {
                    $employeeData['designation'] = $revision->new_designation;
                }

                $employee->update($employeeData);
                
                // Auto-recalculate any active draft payroll runs for this employee's client so processing page stays 100% in sync
                $draftRuns = \App\Models\PayrollRun::where('client_id', $employee->client_id)->where('status', 'draft')->get();
                if ($draftRuns->isNotEmpty()) {
                    $monthlyCalc = app(\App\Services\MonthlyPayrollCalculator::class);
                    $activeEmployees = \App\Models\Employee::where('client_id', $employee->client_id)->where('status', 'active')->get();
                    foreach ($draftRuns as $run) {
                        foreach ($activeEmployees as $empItem) {
                            $monthlyCalc->calculateForEmployee($empItem, $run);
                        }
                    }
                }
            } else {
                $revision->update([
                    'status' => 'rejected',
                    'approved_by' => Auth::id(), // We store the resolver ID here even if rejected
                    'approved_at' => Carbon::now(),
                    'rejection_reason' => $rejectionReason,
                    'updated_by' => Auth::id(),
                ]);
            }
        });

        if ($action === 'approve') {
            $employee = Employee::with('client', 'user')->find($employeeId);
            $recipientEmail = $employee->personal_email ?? optional($employee->user)->email;
            if ($recipientEmail) {
                try {
                    Mail::to($recipientEmail)->send(new PromotionRevisionApprovedMail($employee, $revision));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("Failed sending salary revision email to {$recipientEmail}: " . $e->getMessage());
                }
            }
        }

        $message = $action === 'approve' ? 'Salary revision approved successfully and notification email sent.' : 'Salary revision rejected.';
        return redirect()->back()->with('success', $message);
    }

    public function sendEmail(Request $request, $employeeId, $revisionId)
    {
        $employee = Employee::with('client', 'user')->findOrFail($employeeId);
        $revision = SalaryRevision::where('employee_id', $employeeId)->findOrFail($revisionId);

        $recipientEmail = trim($request->input('recipient_email')) ?: ($employee->personal_email ?? optional($employee->user)->email);
        if (!$recipientEmail) {
            return redirect()->back()->with('error', 'Employee does not have a valid email address configured.');
        }

        $customSubject = $request->input('subject');
        $customNote = $request->input('custom_note');

        try {
            Mail::to($recipientEmail)->send(new PromotionRevisionApprovedMail($employee, $revision, $customSubject, $customNote));
            return redirect()->back()->with('success', "Promotion & Salary Revision letter sent successfully to {$recipientEmail}.");
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Failed sending salary revision email: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to send email notification: ' . $e->getMessage());
        }
    }

    public function queue(Request $request)
    {
        $user = $request->user();
        if ($user && $user->role === 'manager' && !$user->hasModulePermission('emp_salary_revisions', 'candidates')) {
            abort(403, 'You do not have permission to access Salary Revisions Queue.');
        }

        $query = SalaryRevision::with(['employee.client', 'approver']);

        if ($user && $user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            $query->whereHas('employee', function ($q) use ($managedClientIds) {
                $q->whereIn('client_id', $managedClientIds);
            });
        }

        if ($request->filled('client_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('client_id', $request->client_id);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        $statusFilter = $request->input('status', 'pending_approval');
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $baseStatsQuery = SalaryRevision::query();
        if ($user && $user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            $baseStatsQuery->whereHas('employee', function ($q) use ($managedClientIds) {
                $q->whereIn('client_id', $managedClientIds);
            });
        }

        $stats = [
            'total' => (clone $baseStatsQuery)->count(),
            'pending' => (clone $baseStatsQuery)->where('status', 'pending_approval')->count(),
            'approved' => (clone $baseStatsQuery)->where('status', 'approved')->count(),
            'rejected' => (clone $baseStatsQuery)->where('status', 'rejected')->count(),
        ];

        $revisions = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        $clientsQuery = \App\Models\Client::where('status', 'active');
        if ($user && $user->role === 'manager') {
            $clientsQuery->whereIn('id', $user->getManagedClientIds());
        }
        $clients = $clientsQuery->select('id', 'company_name')->get();

        return inertia('Employees/SalaryRevisionsQueue', [
            'revisions' => $revisions,
            'stats' => $stats,
            'clients' => $clients,
            'filters' => [
                'search' => $request->search ?? '',
                'client_id' => $request->client_id ?? '',
                'status' => $statusFilter,
            ],
        ]);
    }
}
