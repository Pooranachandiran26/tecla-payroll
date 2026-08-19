<?php

namespace App\Http\Controllers;

use App\Models\PayrollRun;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayrollController extends Controller
{
    /**
     * Tenant-boundary gate for every payroll-run lifecycle action. Must always be called with a
     * client_id resolved from the payroll run record actually being accessed — never a client_id
     * taken at face value from the request — so a manager can never act on another company's run.
     */
    private function authorizeClientAccess(int $clientId): void
    {
        if (!Auth::user()->isManagerForClient($clientId)) {
            abort(403, 'You do not have access to this client\'s payroll data.');
        }
    }

    /**
     * Approve a payroll run.
     */
    public function approve($id)
    {
        $run = PayrollRun::findOrFail($id);
        $this->authorizeClientAccess($run->client_id);

        if (in_array($run->status, ['approved', 'locked'])) {
            return redirect()->back()->with('error', 'This payroll run is already approved or locked.');
        }

        try {
            $oldStatus = $run->status;
            $run->update([
                'status' => 'approved',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
                'updated_by' => Auth::id(),
            ]);

            app(\App\Services\AuditService::class)->log(
                'payroll.approved',
                Auth::user(),
                $run,
                ['status' => $oldStatus],
                ['status' => 'approved', 'approved_by' => Auth::id()],
                ['payroll_month' => $run->payroll_month, 'client_id' => $run->client_id]
            );

            return redirect()->back()->with('success', 'Payroll run approved successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Lock a payroll run.
     */
    public function lock($id)
    {
        $run = PayrollRun::findOrFail($id);
        $this->authorizeClientAccess($run->client_id);

        if ($run->status === 'locked') {
            return redirect()->back()->with('error', 'This payroll run is already locked.');
        }

        if (!in_array($run->status, ['draft', 'approved'])) {
            return redirect()->back()->with('error', 'Only draft or approved payroll runs can be locked.');
        }

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($run) {
                $oldStatus = $run->status;
                $run->update([
                    'status' => 'locked',
                    'approved_by' => $run->approved_by ?: Auth::id(),
                    'approved_at' => $run->approved_at ?: now(),
                    'locked_at' => now(),
                    'locked_by' => Auth::id(),
                    'updated_by' => Auth::id(),
                ]);

                app(\App\Services\AuditService::class)->log(
                    'payroll.locked',
                    Auth::user(),
                    $run,
                    ['status' => $oldStatus],
                    ['status' => 'locked', 'locked_at' => now()],
                    ['payroll_month' => $run->payroll_month, 'client_id' => $run->client_id]
                );

                // Process loan repayments idempotently for items in this run
                $items = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->where('payroll_run_id', $run->id)
                    ->where('is_excluded', false)
                    ->where('loan_emi_deduction', '>', 0)
                    ->get();

                foreach ($items as $item) {
                    $alreadyProcessed = \App\Models\EmployeeLoanRepayment::where('payroll_run_item_id', $item->id)->exists();
                    if ($alreadyProcessed) {
                        continue;
                    }

                    $employee = \App\Models\Employee::find($item->employee_id);
                    if (!$employee) continue;

                    $monthEnd = \Carbon\Carbon::parse($run->payroll_month)->endOfMonth()->toDateString();
                    $activeLoans = $employee->loans()
                        ->where('status', 'active')
                        ->where('remaining_balance', '>', 0)
                        ->where('start_date', '<=', $monthEnd)
                        ->orderBy('created_at', 'asc')
                        ->get();

                    $remainingToApply = (float) $item->loan_emi_deduction;

                    foreach ($activeLoans as $loan) {
                        if ($remainingToApply <= 0) break;

                        $deductForThisLoan = min($remainingToApply, $loan->remaining_balance);
                        $newRepaid = $loan->total_repaid + $deductForThisLoan;
                        $newBalance = max(0.00, $loan->remaining_balance - $deductForThisLoan);

                        $loan->update([
                            'total_repaid' => $newRepaid,
                            'remaining_balance' => $newBalance,
                            'status' => $newBalance <= 0 ? 'completed' : 'active',
                        ]);

                        \App\Models\EmployeeLoanRepayment::create([
                            'employee_loan_id' => $loan->id,
                            'payroll_run_item_id' => $item->id,
                            'amount_deducted' => $deductForThisLoan,
                            'amount_deferred' => (float) $item->deferred_loan_amount,
                            'payroll_month' => $run->payroll_month,
                        ]);

                        $remainingToApply -= $deductForThisLoan;
                    }
                }

                // Trigger invoice generation upon locking
                $invoiceService = app(\App\Services\InvoiceGenerationService::class);
                $invoiceService->generateForRun($run);
            }); // DB TRANSACTION COMMITS HERE PERMANENTLY

            // Stage 1 (Automatic): Dispatch Salary Review & Summary Email OUTSIDE DB transaction
            $this->dispatchSalaryReviewEmails($run);

            // Resolve linked employee queries and dispatch adjustment emails
            $this->dispatchLinkedQueryResolutionEmails($run);

            $clientModel = $run->client ?? \App\Models\Client::find($run->client_id);
            $isInhouse = $clientModel ? $clientModel->isInhouse() : false;

            if ($run->is_supplementary_run || !empty($run->parent_run_id)) {
                $msg = $isInhouse
                    ? 'Supplementary run locked successfully (In-House Payroll — No billing/invoices).'
                    : 'Supplementary run locked and invoices merged successfully.';
                return redirect()->back()->with('success', $msg);
            }

            if ($isInhouse) {
                return redirect()->route('payroll.payslips', [
                    'client_id' => $run->client_id,
                    'payroll_month' => $run->payroll_month,
                ])->with('success', 'Payroll run locked successfully (In-House Payroll — No billing/invoices). Directed to Payslips.');
            }

            return redirect()->route('invoices.index')->with('success', 'Payroll run locked, invoices generated, and salary summary emails dispatched successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Dispatch Stage 1 Salary Review & Summary emails to active employees in a locked run.
     */
    protected function dispatchSalaryReviewEmails(PayrollRun $run)
    {
        $items = \App\Models\PayrollRunItem::where('payroll_run_id', $run->id)
            ->where('is_excluded', false)
            ->get();

        $mStart = \Carbon\Carbon::parse($run->payroll_month)->startOfMonth();
        $mEnd = \Carbon\Carbon::parse($run->payroll_month)->endOfMonth();

        foreach ($items as $item) {
            try {
                $employee = \App\Models\Employee::find($item->employee_id);
                if (!$employee) continue;

                $recipientEmail = $employee->personal_email ?: optional($employee->user)->email;
                if (!$recipientEmail) continue;

                $rawRecords = \Illuminate\Support\Facades\DB::table('attendance_records')
                    ->where('employee_id', $employee->id)
                    ->whereBetween('attendance_date', [$mStart->toDateString(), $mEnd->toDateString()])
                    ->get();

                $presentDays = $rawRecords->where('status', 'present')->count();

                $weeklyOffDays = 0;
                $curr = $mStart->copy();
                while ($curr->lte($mEnd)) {
                    if ($curr->isWeekend()) {
                        $weeklyOffDays++;
                    }
                    $curr->addDay();
                }

                $holidayDays = \App\Models\Holiday::where('client_id', $employee->client_id)
                    ->whereBetween('holiday_date', [$mStart->toDateString(), $mEnd->toDateString()])
                    ->count();

                $breakdown = [
                    'present_days' => $presentDays,
                    'lop_days' => (float)$item->lop_days,
                    'weekly_off_days' => $weeklyOffDays,
                    'holiday_days' => $holidayDays,
                ];

                $supportUrl = route('employee.contact', ['category' => 'payroll']);

                \Illuminate\Support\Facades\Mail::to($recipientEmail)
                    ->send(new \App\Mail\SalaryReviewSummaryMail($item, $run, $employee, $breakdown, $supportUrl));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Salary review summary email failed for employee {$item->employee_id}: {$e->getMessage()}");
            }
        }

        $run->update(['review_email_sent_at' => now()]);
    }

    /**
     * Resolve linked employee queries and dispatch adjustment emails when a supplementary run is locked.
     */
    protected function dispatchLinkedQueryResolutionEmails(PayrollRun $run)
    {
        $queryItems = \App\Models\PayrollRunItem::where('payroll_run_id', $run->id)
            ->whereNotNull('employee_query_id')
            ->get();

        foreach ($queryItems as $qItem) {
            try {
                $queryModel = \App\Models\EmployeeQuery::find($qItem->employee_query_id);
                if ($queryModel) {
                    $queryModel->update([
                        'status' => 'resolved',
                        'resolved_by' => Auth::id() ?? $run->processed_by,
                        'resolved_at' => now(),
                    ]);

                    $emp = \App\Models\Employee::find($qItem->employee_id);
                    $parentRun = \App\Models\PayrollRun::find($run->parent_run_id ?? $run->id);

                    if ($emp && $parentRun) {
                        $recipient = $emp->personal_email ?: optional($emp->user)->email;
                        if ($recipient) {
                            $allRunIds = $parentRun->children()->pluck('id')->prepend($parentRun->id)->toArray();
                            $rawEmpItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                                ->whereIn('payroll_run_id', $allRunIds)
                                ->where('employee_id', $emp->id)
                                ->get();

                            $consolidated = app(\App\Services\PayrollCorrectionService::class)
                                ->consolidateItemsForDisplay($rawEmpItems)
                                ->first();

                            $origItem = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                                ->where('payroll_run_id', $parentRun->id)
                                ->where('employee_id', $emp->id)
                                ->first();

                            $parentNet = $origItem ? (float)$origItem->net_pay : (float)$consolidated->net_pay;
                            $netVariance = round((float)$consolidated->net_pay - $parentNet, 2);

                            $adjustmentSummary = [
                                'corrected_paid_days' => (float)$consolidated->paid_days,
                                'final_net_pay' => (float)$consolidated->net_pay,
                                'net_variance' => $netVariance,
                            ];

                            \Illuminate\Support\Facades\Mail::to($recipient)->send(
                                new \App\Mail\QueryResolvedWithPayrollAdjustmentMail(
                                    $queryModel,
                                    $qItem,
                                    $parentRun,
                                    $emp,
                                    $adjustmentSummary
                                )
                            );
                        }
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Linked query resolution email failed for Query #{$qItem->employee_query_id}: {$e->getMessage()}");
            }
        }
    }

    /**
     * Stage 2 (Manual): Release Official PDF Payslips to employees in a locked run.
     */
    public function releasePayslips(Request $request, $id)
    {
        $run = PayrollRun::findOrFail($id);

        if ($run->status !== 'locked') {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'Payslips can only be released for locked payroll runs.'], 422);
            }
            return redirect()->back()->with('error', 'Payslips can only be released for locked payroll runs.');
        }

        $user = Auth::user();
        $isAuthorized = $user && ($user->role === 'admin' || ($user->role === 'manager' && $user->isManagerForClient($run->client_id)));

        if (!$isAuthorized) {
            if ($request->wantsJson()) {
                return response()->json(['error' => 'You do not have permission to release payslips for this client.'], 403);
            }
            abort(403, 'You do not have permission to release payslips for this client.');
        }

        $pdfService = app(\App\Services\PayslipPdfService::class);

        $query = \App\Models\PayrollRunItem::where('payroll_run_id', $run->id)
            ->where('is_excluded', false);

        if ($request->has('employee_id') && !empty($request->employee_id)) {
            $query->where('employee_id', $request->employee_id);
        }

        $items = $query->get();

        foreach ($items as $item) {
            try {
                $employee = \App\Models\Employee::find($item->employee_id);
                if (!$employee) continue;

                $recipientEmail = $employee->personal_email ?: optional($employee->user)->email;
                if (!$recipientEmail) continue;

                $pdfBytes = $pdfService->generatePdfBinary($item);

                \Illuminate\Support\Facades\Mail::to($recipientEmail)
                    ->send(new \App\Mail\OfficialPayslipReleasedMail($item, $run, $employee, $pdfBytes));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Official payslip release email failed for employee {$item->employee_id}: {$e->getMessage()}");
            }
        }

        $run->update([
            'payslip_released_at' => now(),
            'payslip_released_by' => Auth::id(),
            'resend_count' => ($run->resend_count ?? 0) + 1,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['success' => 'Official payslips released successfully.']);
        }

        return redirect()->back()->with('success', 'Official payslips released and emailed successfully.');
    }

    /**
     * Run supplementary payroll for previously excluded employees.
     */
    public function runSupplementary($id)
    {
        $parent = PayrollRun::findOrFail($id);
        $this->authorizeClientAccess($parent->client_id);

        if (!in_array($parent->status, ['approved', 'locked'])) {
            return redirect()->back()->with('error', 'Supplementary runs can only be triggered on approved or locked parent runs.');
        }

        $existingDraft = PayrollRun::where('parent_run_id', $parent->id)
            ->where('status', 'draft')
            ->first();

        if ($existingDraft) {
            return redirect()->back()->with('error', 'A draft supplementary run already exists for this parent. Please approve or delete it before creating another.');
        }

        $monthStart = \Carbon\Carbon::parse($parent->payroll_month)->startOfMonth()->toDateString();
        $monthEnd = \Carbon\Carbon::parse($parent->payroll_month)->endOfMonth()->toDateString();

        // 1. Get all employee IDs that were excluded in the parent run
        $excludedEmployeeIds = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->where('payroll_run_id', $parent->id)
            ->where('is_excluded', true)
            ->pluck('employee_id')
            ->toArray();

        // 2. Get all employee IDs already referenced in the parent run (processed or excluded)
        $existingEmployeeIds = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->where('payroll_run_id', $parent->id)
            ->pluck('employee_id')
            ->toArray();

        // 3. Get newly-joined active employees under this client who do not have any row in the parent run
        $newEmployeeIds = $parent->getNewHireCandidates()->pluck('id')->toArray();

        // Union both groups
        $targetEmployeeIds = array_unique(array_merge($excludedEmployeeIds, $newEmployeeIds));

        if (empty($targetEmployeeIds)) {
            return redirect()->back()->with('error', 'No eligible excluded or newly-joined employees found for supplementary payroll.');
        }

        $client = \App\Models\Client::findOrFail($parent->client_id);
        app(\App\Services\PayrollCycleWarningService::class)->ensureCycleEnded($client, $parent->payroll_month);

        $employees = \App\Models\Employee::whereIn('id', $targetEmployeeIds)->get();

        $eligibilityService = app(\App\Services\PayrollEligibilityService::class);

        // Pre-flight check: ensure at least 1 candidate is eligible before persisting PayrollRun
        $allowTestingBypass = filter_var(env('ALLOW_EARLY_PAYROLL_PROCESSING', false), FILTER_VALIDATE_BOOLEAN);
        $eligibleCount = 0;
        foreach ($employees as $employee) {
            $elig = $eligibilityService->checkEmployee($employee, $client, $monthStart, $monthEnd);
            if ($elig['is_eligible']) {
                $eligibleCount++;
            }
        }

        if ($eligibleCount === 0 && !$allowTestingBypass) {
            return redirect()->back()->with('error', 'Cannot create supplementary run: None of the candidate employees have attendance or valid eligibility data. Please upload attendance first.');
        }

        // 1. Create a draft supplementary run
        $supplementaryRun = PayrollRun::create([
            'client_id' => $parent->client_id,
            'payroll_month' => $parent->payroll_month,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parent->id,
            'processed_by' => Auth::id(),
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $attendanceService = app(\App\Services\AttendanceResolutionService::class);
        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);

        $processedCount = 0;
        $excludedCount = 0;
        $totalGross = 0;
        $totalNet = 0;
        $totalEmployerStatutory = 0;

        foreach ($employees as $employee) {
            // Check eligibility fresh
            $eligibility = $eligibilityService->checkEmployee($employee, $client, $monthStart, $monthEnd);

            if ($eligibility['is_eligible']) {
                // Resolve attendance
                $attendanceService->resolveForEmployee($employee, $monthStart, $monthEnd);

                // Calculate payroll
                $calcResult = $calculator->calculateForEmployee($employee, $supplementaryRun);

                // Safety check: Flag if new hire joined > 60 days before month start
                if (in_array($employee->id, $newEmployeeIds) && $employee->date_of_joining) {
                    $doj = \Carbon\Carbon::parse($employee->date_of_joining);
                    $monthStartCarbon = \Carbon\Carbon::parse($monthStart);
                    if ($doj->diffInDays($monthStartCarbon, false) > 60) {
                        $warningMessage = "Employee {$employee->employee_code} has no row in this month's parent run despite joining on {$employee->date_of_joining} (more than 60 days ago) — investigate why they were missed";
                        
                        \Illuminate\Support\Facades\Log::warning($warningMessage);

                        $existingItem = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                            ->where('payroll_run_id', $supplementaryRun->id)
                            ->where('employee_id', $employee->id)
                            ->first();

                        if ($existingItem) {
                            $newWarningNotes = empty($existingItem->warning_notes) 
                                ? $warningMessage 
                                : $existingItem->warning_notes . ', ' . $warningMessage;

                            \Illuminate\Support\Facades\DB::table('payroll_run_items')
                                ->where('id', $existingItem->id)
                                ->update(['warning_notes' => $newWarningNotes]);
                        }
                    }
                }

                $processedCount++;
                $totalGross += (float)$calcResult['gross_total'];
                $totalNet += (float)$calcResult['net_pay'];
                $totalEmployerStatutory += (float)($calcResult['employer_statutory_cost'] ?? 0);
            } else {
                // Create an excluded payroll_run_item for history
                \Illuminate\Support\Facades\DB::table('payroll_run_items')->insert([
                    'payroll_run_id' => $supplementaryRun->id,
                    'employee_id' => $employee->id,
                    'paid_days' => 0,
                    'lop_days' => 0,
                    'basic_pay' => 0,
                    'hra' => 0,
                    'conveyance' => 0,
                    'da' => 0,
                    'medical_allowance' => 0,
                    'special_allowance' => 0,
                    'other_additions' => 0,
                    'gross_total' => 0,
                    'employee_pf' => 0,
                    'employee_esi' => 0,
                    'professional_tax' => 0,
                    'lwf_deduction' => 0,
                    'lop_deduction' => 0,
                    'tds_deduction' => 0,
                    'loan_emi_deduction' => 0,
                    'net_pay' => 0,
                    'employer_pf' => 0,
                    'employer_esi' => 0,
                    'employer_lwf' => 0,
                    'is_excluded' => true,
                    'exclusion_reason' => implode(', ', $eligibility['exclusions']),
                    'warning_notes' => implode(', ', $eligibility['warnings']),
                    'attendance_source' => 'live_punch',
                    'created_by' => Auth::id(),
                    'updated_by' => Auth::id(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $excludedCount++;
            }
        }

        // Update the supplementary run totals
        $supplementaryRun->update([
            'total_employees_processed' => $processedCount,
            'total_employees_excluded' => $excludedCount,
            'total_gross_earnings' => $totalGross,
            'total_net_disbursement' => $totalNet,
            'total_employer_statutory_cost' => $totalEmployerStatutory,
        ]);

        return redirect()->back()->with('success', 'Supplementary payroll run processed successfully.');
    }

    /**
     * Start/Process a payroll run.
     */
    public function process(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'payroll_month' => 'required|date',
        ]);

        $clientId = $validated['client_id'];
        $payrollMonth = \Carbon\Carbon::parse($validated['payroll_month'])->startOfMonth()->toDateString();
        $client = \App\Models\Client::findOrFail($clientId);
        $this->authorizeClientAccess($client->id);

        try {
            // Draft/incomplete clients are setup records, not operational clients — block direct
            // API submission of a client_id that bypasses the (already-filtered) dropdown. See
            // Client::scopeOperational().
            if (!$client->isOperational()) {
                throw new \Exception('This client has not completed onboarding and is not available for payroll processing.');
            }

            app(\App\Services\PayrollCycleWarningService::class)->ensureCycleEnded($client, $payrollMonth);

            $run = \Illuminate\Support\Facades\DB::transaction(function () use ($clientId, $payrollMonth) {
                // Lock for concurrency
                $existing = PayrollRun::where('client_id', $clientId)
                    ->where('payroll_month', $payrollMonth)
                    ->lockForUpdate()
                    ->latest('id')
                    ->first();

                if ($existing) {
                    if ($existing->status === 'locked') {
                        throw new \Exception("This payroll run is already locked and invoiced.");
                    }
                    if ($existing->status === 'approved') {
                        throw new \Exception("This payroll run is already approved. You must revert it to draft first.");
                    }

                    // Draft run: Re-run in-place by deleting existing items
                    \Illuminate\Support\Facades\DB::table('payroll_run_items')
                        ->where('payroll_run_id', $existing->id)
                        ->delete();

                    $run = $existing;
                } else {
                    // Create new draft run
                    $run = PayrollRun::create([
                        'client_id' => $clientId,
                        'payroll_month' => $payrollMonth,
                        'status' => 'draft',
                        'total_employees_processed' => 0,
                        'total_employees_excluded' => 0,
                        'total_gross_earnings' => 0,
                        'total_net_disbursement' => 0,
                        'total_employer_statutory_cost' => 0,
                        'processed_by' => Auth::id(),
                        'created_by' => Auth::id(),
                        'updated_by' => Auth::id(),
                    ]);
                }

                $monthStart = \Carbon\Carbon::parse($payrollMonth)->startOfMonth()->toDateString();
                $monthEnd = \Carbon\Carbon::parse($payrollMonth)->endOfMonth()->toDateString();

                $client = \App\Models\Client::findOrFail($clientId);
                $employees = \App\Models\Employee::where('client_id', $clientId)
                    ->where(function($q) use ($monthStart, $monthEnd) {
                        $q->where('status', 'active')
                          ->orWhere(function($sub) use ($monthStart, $monthEnd) {
                              $sub->where('status', 'exited')
                                  ->whereHas('exitRequest', function($exit) use ($monthStart, $monthEnd) {
                                      $exit->whereBetween('last_working_day', [$monthStart, $monthEnd]);
                                  });
                          });
                    })
                    ->get();

                $eligibilityService = app(\App\Services\PayrollEligibilityService::class);
                $attendanceService = app(\App\Services\AttendanceResolutionService::class);
                $calculator = app(\App\Services\MonthlyPayrollCalculator::class);

                $processedCount = 0;
                $excludedCount = 0;
                $totalGross = 0;
                $totalNet = 0;
                $totalEmployerStatutory = 0;

                foreach ($employees as $employee) {
                    $eligibility = $eligibilityService->checkEmployee($employee, $client, $monthStart, $monthEnd);

                    if ($eligibility['is_eligible']) {
                        $attendanceService->resolveForEmployee($employee, $monthStart, $monthEnd);
                        $calcResult = $calculator->calculateForEmployee($employee, $run);

                        $processedCount++;
                        $totalGross += (float)$calcResult['gross_total'];
                        $totalNet += (float)$calcResult['net_pay'];
                        $totalEmployerStatutory += (float)($calcResult['employer_statutory_cost'] ?? 0);
                    } else {
                        // Create excluded item for history
                        \Illuminate\Support\Facades\DB::table('payroll_run_items')->insert([
                            'payroll_run_id' => $run->id,
                            'employee_id' => $employee->id,
                            'paid_days' => 0,
                            'lop_days' => 0,
                            'basic_pay' => 0,
                            'hra' => 0,
                            'conveyance' => 0,
                            'da' => 0,
                            'medical_allowance' => 0,
                            'special_allowance' => 0,
                            'other_additions' => 0,
                            'gross_total' => 0,
                            'employee_pf' => 0,
                            'employee_esi' => 0,
                            'professional_tax' => 0,
                            'lwf_deduction' => 0,
                            'lop_deduction' => 0,
                            'tds_deduction' => 0,
                            'loan_emi_deduction' => 0,
                            'net_pay' => 0,
                            'employer_pf' => 0,
                            'employer_esi' => 0,
                            'employer_lwf' => 0,
                            'is_excluded' => true,
                            'exclusion_reason' => implode(', ', $eligibility['exclusions']),
                            'warning_notes' => implode(', ', $eligibility['warnings']),
                            'attendance_source' => 'live_punch',
                            'created_by' => Auth::id(),
                            'updated_by' => Auth::id(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        $excludedCount++;
                    }
                }

                $run->update([
                    'total_employees_processed' => $processedCount,
                    'total_employees_excluded' => $excludedCount,
                    'total_gross_earnings' => $totalGross,
                    'total_net_disbursement' => $totalNet,
                    'total_employer_statutory_cost' => $totalEmployerStatutory,
                    'processed_by' => Auth::id(),
                ]);

                return $run;
            });

            return redirect()->back()->with('success', 'Payroll run processed successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Show payroll processing screen.
     */
    public function indexProcessing(Request $request)
    {
        $user = $request->user();

        $clientsQuery = \App\Models\Client::where('status', 'active');
        if ($user && $user->role === 'manager') {
            $clientsQuery->whereIn('id', $user->getManagedClientIds());
        }
        $clients = $clientsQuery
            ->select('id', 'company_name')
            ->orderBy('id', 'desc')
            ->get();

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $defaultClientId = ($activeSessionClientId && $activeSessionClientId !== 'all')
            ? (int)$activeSessionClientId
            : $clients->first()?->id;

        $selectedClientId = $request->has('client_id')
            ? $request->query('client_id')
            : $defaultClientId;

        if ($selectedClientId === 'all' || $selectedClientId === '') {
            $selectedClientId = $defaultClientId;
        }

        // A manager may only ever land on a client within their managed scope, even if the
        // query string is crafted to name another company's client_id directly.
        if ($selectedClientId && $user && $user->role === 'manager' && !$user->isManagerForClient($selectedClientId)) {
            abort(403, 'You do not have access to this client\'s payroll data.');
        }

        $defaultMonth = now()->subMonth()->startOfMonth()->toDateString();
        $selectedMonth = $request->query('payroll_month', $defaultMonth);

        $run = null;
        $items = [];
        $preflight = [];
        $client = null;
        $newHires = [];

        if ($selectedClientId) {
            $client = \App\Models\Client::find($selectedClientId);
            if ($client) {
                $cycleWarning = app(\App\Services\PayrollCycleWarningService::class)->checkCycleTiming($client, $selectedMonth);
                if ($cycleWarning) {
                    $preflight[] = $cycleWarning;
                }
            }

            $run = PayrollRun::where('client_id', $selectedClientId)
                ->where('payroll_month', $selectedMonth)
                ->where('is_supplementary_run', false)
                ->latest('id')
                ->first();

            if ($run) {
                $allRunIds = $run->children()->pluck('id')->prepend($run->id)->toArray();

                $rawItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
                    ->whereIn('payroll_run_id', $allRunIds)
                    ->select('payroll_run_items.*', 'payroll_run_items.id as id', 'employees.full_name', 'employees.employee_code')
                    ->orderBy('payroll_run_items.id', 'asc')
                    ->get();

                $items = $this->consolidateItemsForDisplay($rawItems);

                $clientModel = \App\Models\Client::find($run->client_id);
                $mStart = \Carbon\Carbon::parse($run->payroll_month)->startOfMonth()->toDateString();
                $mEnd = \Carbon\Carbon::parse($run->payroll_month)->endOfMonth()->toDateString();
                $eligibilityService = app(\App\Services\PayrollEligibilityService::class);

                $newHires = $run->getNewHireCandidates()->map(function ($emp) use ($clientModel, $mStart, $mEnd, $eligibilityService) {
                    $elig = $eligibilityService->checkEmployee($emp, $clientModel, $mStart, $mEnd);
                    return [
                        'id' => $emp->id,
                        'full_name' => $emp->full_name,
                        'employee_code' => $emp->employee_code,
                        'date_of_joining' => $emp->date_of_joining,
                        'is_eligible' => $elig['is_eligible'],
                        'exclusions' => $elig['exclusions'],
                    ];
                })->toArray();

                $pendingSupplementaryRuns = $run->children()
                    ->where('status', '!=', 'locked')
                    ->get()
                    ->map(function ($sr) {
                        $hasCorrection = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                            ->where('payroll_run_id', $sr->id)
                            ->where('is_correction', true)
                            ->exists();

                        $srItems = \App\Models\PayrollRunItem::where('payroll_run_id', $sr->id)
                            ->where('is_excluded', false)
                            ->get();

                        $empIds = $srItems->pluck('employee_id')->filter()->unique()->toArray();
                        $employees = \App\Models\Employee::whereIn('id', $empIds)->get()->keyBy('id');

                        $processedEmployees = $srItems->map(function ($i) use ($employees) {
                            $emp = $employees->get($i->employee_id);
                            return [
                                'id' => $i->employee_id,
                                'full_name' => $emp ? $emp->full_name : '—',
                                'employee_code' => $emp ? $emp->employee_code : '—',
                                'designation' => $emp ? $emp->designation : '—',
                                'net_pay' => (float)$i->net_pay,
                                'gross_total' => (float)$i->gross_total,
                                'correction_reason' => $i->correction_reason,
                            ];
                        })->values()->toArray();

                        return [
                            'id' => $sr->id,
                            'status' => $sr->status,
                            'created_at' => $sr->created_at,
                            'total_employees_processed' => $sr->total_employees_processed,
                            'total_employees_excluded' => $sr->total_employees_excluded,
                            'total_gross_earnings' => $sr->total_gross_earnings,
                            'total_net_disbursement' => $sr->total_net_disbursement,
                            'run_type' => $hasCorrection ? 'correction' : 'new_hire',
                            'processed_employees' => $processedEmployees,
                        ];
                    })
                    ->toArray();

                foreach ($items as $item) {
                    if ($item->is_excluded) {
                        $preflight[] = [
                            'type' => 'red',
                            'msg' => "{$item->full_name} ({$item->employee_code}) excluded: {$item->exclusion_reason}"
                        ];
                    } elseif (!empty($item->warning_notes)) {
                        $preflight[] = [
                            'type' => 'amber',
                            'msg' => "{$item->full_name} ({$item->employee_code}) warning: {$item->warning_notes}"
                        ];
                    }

                    if ($item->salary_revision_applied) {
                        $mStart = \Carbon\Carbon::parse($selectedMonth)->startOfMonth();
                        $mEnd = \Carbon\Carbon::parse($selectedMonth)->endOfMonth();
                        $rev = \Illuminate\Support\Facades\DB::table('salary_revisions')
                            ->where('employee_id', $item->employee_id)
                            ->where('status', 'approved')
                            ->whereBetween('effective_date', [$mStart->toDateString(), $mEnd->toDateString()])
                            ->first();

                        if ($rev) {
                            $eff = \Carbon\Carbon::parse($rev->effective_date)->startOfDay();
                            $daysBefore = (int)round($mStart->diffInDays($eff));
                            $daysAfter = (int)round($eff->diffInDays($mEnd) + 1);
                            $oldRate = (float)(
                                ($rev->old_basic_pay ?? 0) +
                                ($rev->old_hra ?? 0) +
                                ($rev->old_conveyance ?? 0) +
                                ($rev->old_da ?? 0) +
                                ($rev->old_medical_allowance ?? 0) +
                                ($rev->old_special_allowance ?? 0) +
                                ($rev->old_other_additions ?? 0)
                            );
                            $newRate = (float)(
                                ($rev->new_basic_pay ?? 0) +
                                ($rev->new_hra ?? 0) +
                                ($rev->new_conveyance ?? 0) +
                                ($rev->new_da ?? 0) +
                                ($rev->new_medical_allowance ?? 0) +
                                ($rev->new_special_allowance ?? 0) +
                                ($rev->new_other_additions ?? 0)
                            );
                            $basePay = (float)$item->gross_total;

                            $item->mid_cycle_note = "Mid-Cycle Split: {$daysBefore} days @ old rate (₹" . number_format($oldRate, 0) . "/mo) + {$daysAfter} days @ new rate (₹" . number_format($newRate, 0) . "/mo) = ₹" . number_format($basePay, 0) . " this month base";
                        } elseif (!empty($item->warning_notes) && str_contains($item->warning_notes, 'Mid-Cycle Split')) {
                            $parts = explode(' | ', $item->warning_notes);
                            foreach ($parts as $p) {
                                if (str_contains($p, 'Mid-Cycle Split')) {
                                    $item->mid_cycle_note = $p;
                                }
                            }
                        } else {
                            $item->mid_cycle_note = "Mid-Cycle Split applied for effective date in " . \Carbon\Carbon::parse($selectedMonth)->format('M Y');
                        }
                    }
                }
            }
        }

        return \Inertia\Inertia::render('Payroll/PayrollProcessing', [
            'clients' => $clients,
            'selectedClientId' => (int) $selectedClientId,
            'selectedMonth' => $selectedMonth,
            'run' => $run ? array_merge($run->load('client')->toArray(), $run->getCombinedStats()) : null,
            'items' => $items,
            'preflight' => $preflight,
            'newHires' => $newHires,
            'pendingSupplementaryRuns' => $pendingSupplementaryRuns ?? [],
            'cycleInfo' => $client ? [
                'payroll_lock_day' => $client->payroll_lock_day,
                'salary_credit_day' => $client->salary_credit_day,
                'cycle_end_date' => $client->getCycleEndDate($selectedMonth)->format('M j, Y'),
                'target_lock_date' => $client->getTargetLockDate($selectedMonth),
                'target_salary_credit_date' => $client->getTargetSalaryCreditDate($selectedMonth),
            ] : null,
        ]);
    }

    /**
     * Show payroll approval screen.
     */
    public function indexApproval(Request $request)
    {
        $user = $request->user();

        $clientsQuery = \App\Models\Client::where('status', 'active');
        if ($user && $user->role === 'manager') {
            $clientsQuery->whereIn('id', $user->getManagedClientIds());
        }
        $clients = $clientsQuery
            ->select('id', 'company_name')
            ->orderBy('id', 'desc')
            ->get();

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $defaultClientId = ($activeSessionClientId && $activeSessionClientId !== 'all')
            ? (int)$activeSessionClientId
            : $clients->first()?->id;

        $selectedClientId = $request->has('client_id')
            ? $request->query('client_id')
            : $defaultClientId;

        if ($selectedClientId === 'all' || $selectedClientId === '') {
            $selectedClientId = $defaultClientId;
        }

        // A manager may only ever land on a client within their managed scope, even if the
        // query string is crafted to name another company's client_id directly.
        if ($selectedClientId && $user && $user->role === 'manager' && !$user->isManagerForClient($selectedClientId)) {
            abort(403, 'You do not have access to this client\'s payroll data.');
        }

        $defaultMonth = now()->subMonth()->startOfMonth()->toDateString();
        $selectedMonth = $request->query('payroll_month', $defaultMonth);

        $run = null;
        $items = [];
        $preflight = [];
        $client = null;
        $newHires = [];

        if ($selectedClientId) {
            $client = \App\Models\Client::find($selectedClientId);
            if ($client) {
                $cycleWarning = app(\App\Services\PayrollCycleWarningService::class)->checkCycleTiming($client, $selectedMonth);
                if ($cycleWarning) {
                    $preflight[] = $cycleWarning;
                }
            }

            $run = PayrollRun::where('client_id', $selectedClientId)
                ->where('payroll_month', $selectedMonth)
                ->where('is_supplementary_run', false)
                ->latest('id')
                ->first();

            if ($run) {
                $allRunIds = $run->children()->pluck('id')->prepend($run->id)->toArray();

                $rawItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
                    ->whereIn('payroll_run_id', $allRunIds)
                    ->select('payroll_run_items.*', 'payroll_run_items.id as id', 'employees.full_name', 'employees.employee_code')
                    ->orderBy('payroll_run_items.id', 'asc')
                    ->get();

                $items = $this->consolidateItemsForDisplay($rawItems);

                $clientModel = \App\Models\Client::find($run->client_id);
                $mStart = \Carbon\Carbon::parse($run->payroll_month)->startOfMonth()->toDateString();
                $mEnd = \Carbon\Carbon::parse($run->payroll_month)->endOfMonth()->toDateString();
                $eligibilityService = app(\App\Services\PayrollEligibilityService::class);

                $newHires = $run->getNewHireCandidates()->map(function ($emp) use ($clientModel, $mStart, $mEnd, $eligibilityService) {
                    $elig = $eligibilityService->checkEmployee($emp, $clientModel, $mStart, $mEnd);
                    return [
                        'id' => $emp->id,
                        'full_name' => $emp->full_name,
                        'employee_code' => $emp->employee_code,
                        'date_of_joining' => $emp->date_of_joining,
                        'is_eligible' => $elig['is_eligible'],
                        'exclusions' => $elig['exclusions'],
                    ];
                })->toArray();

                $pendingSupplementaryRuns = $run->children()
                    ->where('status', '!=', 'locked')
                    ->get()
                    ->map(function ($sr) {
                        $hasCorrection = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                            ->where('payroll_run_id', $sr->id)
                            ->where('is_correction', true)
                            ->exists();

                        $srItems = \App\Models\PayrollRunItem::where('payroll_run_id', $sr->id)
                            ->where('is_excluded', false)
                            ->get();

                        $empIds = $srItems->pluck('employee_id')->filter()->unique()->toArray();
                        $employees = \App\Models\Employee::whereIn('id', $empIds)->get()->keyBy('id');

                        $processedEmployees = $srItems->map(function ($i) use ($employees) {
                            $emp = $employees->get($i->employee_id);
                            return [
                                'id' => $i->employee_id,
                                'full_name' => $emp ? $emp->full_name : '—',
                                'employee_code' => $emp ? $emp->employee_code : '—',
                                'designation' => $emp ? $emp->designation : '—',
                                'net_pay' => (float)$i->net_pay,
                                'gross_total' => (float)$i->gross_total,
                                'correction_reason' => $i->correction_reason,
                            ];
                        })->values()->toArray();

                        return [
                            'id' => $sr->id,
                            'status' => $sr->status,
                            'created_at' => $sr->created_at,
                            'total_employees_processed' => $sr->total_employees_processed,
                            'total_employees_excluded' => $sr->total_employees_excluded,
                            'total_gross_earnings' => $sr->total_gross_earnings,
                            'total_net_disbursement' => $sr->total_net_disbursement,
                            'run_type' => $hasCorrection ? 'correction' : 'new_hire',
                            'processed_employees' => $processedEmployees,
                        ];
                    })
                    ->toArray();

                foreach ($items as $item) {
                    if ($item->is_excluded) {
                        $preflight[] = [
                            'type' => 'red',
                            'msg' => "{$item->full_name} ({$item->employee_code}) excluded: {$item->exclusion_reason}"
                        ];
                    } elseif (!empty($item->warning_notes)) {
                        $preflight[] = [
                            'type' => 'amber',
                            'msg' => "{$item->full_name} ({$item->employee_code}) warning: {$item->warning_notes}"
                        ];
                    }

                    if ($item->salary_revision_applied) {
                        $mStart = \Carbon\Carbon::parse($selectedMonth)->startOfMonth();
                        $mEnd = \Carbon\Carbon::parse($selectedMonth)->endOfMonth();
                        $rev = \Illuminate\Support\Facades\DB::table('salary_revisions')
                            ->where('employee_id', $item->employee_id)
                            ->where('status', 'approved')
                            ->whereBetween('effective_date', [$mStart->toDateString(), $mEnd->toDateString()])
                            ->first();

                        if ($rev) {
                            $eff = \Carbon\Carbon::parse($rev->effective_date)->startOfDay();
                            $daysBefore = $mStart->diffInDays($eff);
                            $daysAfter = $eff->diffInDays($mEnd) + 1;
                            $oldRate = (float)(
                                ($rev->old_basic_pay ?? 0) +
                                ($rev->old_hra ?? 0) +
                                ($rev->old_conveyance ?? 0) +
                                ($rev->old_da ?? 0) +
                                ($rev->old_medical_allowance ?? 0) +
                                ($rev->old_special_allowance ?? 0) +
                                ($rev->old_other_additions ?? 0)
                            );
                            $newRate = (float)(
                                ($rev->new_basic_pay ?? 0) +
                                ($rev->new_hra ?? 0) +
                                ($rev->new_conveyance ?? 0) +
                                ($rev->new_da ?? 0) +
                                ($rev->new_medical_allowance ?? 0) +
                                ($rev->new_special_allowance ?? 0) +
                                ($rev->new_other_additions ?? 0)
                            );
                            $basePay = (float)$item->gross_total;

                            $item->mid_cycle_note = "Mid-Cycle Split: {$daysBefore} days @ old rate (₹" . number_format($oldRate, 0) . "/mo) + {$daysAfter} days @ new rate (₹" . number_format($newRate, 0) . "/mo) = ₹" . number_format($basePay, 0) . " this month base";
                        } elseif (!empty($item->warning_notes) && str_contains($item->warning_notes, 'Mid-Cycle Split')) {
                            $parts = explode(' | ', $item->warning_notes);
                            foreach ($parts as $p) {
                                if (str_contains($p, 'Mid-Cycle Split')) {
                                    $item->mid_cycle_note = $p;
                                }
                            }
                        } else {
                            $item->mid_cycle_note = "Mid-Cycle Split applied for effective date in " . \Carbon\Carbon::parse($selectedMonth)->format('M Y');
                        }
                    }
                }
            }
        }

        return \Inertia\Inertia::render('Payroll/PayrollApproval', [
            'clients' => $clients,
            'selectedClientId' => (int) $selectedClientId,
            'selectedMonth' => $selectedMonth,
            'allowTestingBypass' => filter_var(env('ALLOW_EARLY_PAYROLL_PROCESSING', false), FILTER_VALIDATE_BOOLEAN),
            'run' => $run ? array_merge($run->load('client')->toArray(), $run->getCombinedStats(), [
                'released_by_user_name' => $run->payslip_released_by ? optional(\App\Models\User::find($run->payslip_released_by))->name : null,
            ]) : null,
            'items' => $items,
            'preflight' => $preflight,
            'newHires' => $newHires,
            'pendingSupplementaryRuns' => $pendingSupplementaryRuns ?? [],
            'cycleInfo' => $client ? [
                'payroll_lock_day' => $client->payroll_lock_day,
                'salary_credit_day' => $client->salary_credit_day,
                'cycle_end_date' => $client->getCycleEndDate($selectedMonth)->format('M j, Y'),
                'target_lock_date' => $client->getTargetLockDate($selectedMonth),
                'target_salary_credit_date' => $client->getTargetSalaryCreditDate($selectedMonth),
            ] : null,
        ]);
    }

    /**
     * List generated invoices.
     */
    public function indexInvoices(Request $request)
    {
        $invoices = \App\Models\Invoice::with(['client', 'branch'])
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        return \Inertia\Inertia::render('Invoicing/InvoicesList', [
            'invoices' => $invoices,
        ]);
    }

    /**
     * List finalized payslips.
     */
    public function indexPayslips(Request $request)
    {
        $user = $request->user();

        $clientsQuery = \App\Models\Client::where('status', 'active');
        if ($user && $user->role === 'manager') {
            $clientsQuery->whereIn('id', $user->getManagedClientIds());
        }
        $clients = $clientsQuery
            ->select('id', 'company_name')
            ->orderBy('id', 'desc')
            ->get();

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->query('client_id')
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);

        if (!$selectedClientId && $clients->isNotEmpty()) {
            $selectedClientId = $clients->first()->id;
        }

        // A manager may only ever land on a client within their managed scope, even if the
        // query string is crafted to name another company's client_id directly.
        if ($selectedClientId && $user && $user->role === 'manager' && !$user->isManagerForClient($selectedClientId)) {
            abort(403, 'You do not have access to this client\'s payroll data.');
        }

        if ($selectedClientId) {
            $selectedClient = \App\Models\Client::find($selectedClientId);
            if ($selectedClient && (is_null($selectedClient->payslip_template) || $selectedClient->payslip_template === '' || $selectedClient->payslip_template === 'none')) {
                return redirect()->route('admin.payslip-templates', ['client_id' => $selectedClient->id])
                    ->with('warning', "⚠️ No payslip template configured for {$selectedClient->company_name}. Please select and save a template first.");
            }
        }

        $selectedMonth = $request->query('payroll_month');
        if (!$selectedMonth) {
            $latestRun = \App\Models\PayrollRun::where('status', 'locked')->latest('payroll_month')->first();
            $selectedMonth = $latestRun ? $latestRun->payroll_month : '2026-07-01';
        }

        $lockedRunQuery = \App\Models\PayrollRun::where('status', 'locked')
            ->where('payroll_month', $selectedMonth)
            ->when($selectedClientId, function ($query) use ($selectedClientId) {
                $query->where('client_id', $selectedClientId);
            });

        $lockedRun = (clone $lockedRunQuery)->first();
        $lockedRunIds = $lockedRunQuery->pluck('id');

        $rawItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
            ->whereIn('payroll_run_id', $lockedRunIds)
            ->select(
                'payroll_run_items.*',
                'payroll_run_items.id as id',
                'employees.full_name',
                'employees.employee_code',
                'employees.designation',
                'employees.bank_name',
                'employees.bank_account_number',
                'employees.employment_model'
            )
            ->orderBy('payroll_run_items.id', 'asc')
            ->get();

        $runItems = $this->consolidateItemsForDisplay($rawItems)
            ->where('is_excluded', false)
            ->values();

        $employeeIds = $runItems->pluck('employee_id')->unique();
        $employees = \App\Models\Employee::whereIn('id', $employeeIds)->get()->keyBy('id');

        $mappedItems = $runItems->map(function ($item) use ($employees) {
            $arr = (array)$item;
            $emp = $employees->get($item->employee_id);
            return array_merge($arr, [
                'full_name' => $emp ? $emp->full_name : ($arr['full_name'] ?? '—'),
                'employee_code' => $emp ? $emp->employee_code : ($arr['employee_code'] ?? '—'),
                'designation' => $emp ? $emp->designation : ($arr['designation'] ?? '—'),
                'bank_name' => $emp ? $emp->bank_name : ($arr['bank_name'] ?? '—'),
                'bank_account_number' => $emp ? $emp->bank_account_number : ($arr['bank_account_number'] ?? '—'),
                'employment_model' => $emp ? $emp->employment_model : ($arr['employment_model'] ?? '—'),
            ]);
        });

        $page = (int)$request->query('page', 1);
        $perPage = 15;
        $slicedItems = $mappedItems->slice(($page - 1) * $perPage, $perPage)->values();

        $items = new \Illuminate\Pagination\LengthAwarePaginator(
            $slicedItems,
            $mappedItems->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        $selectedClient = $selectedClientId ? \App\Models\Client::find($selectedClientId) : null;
        $clientBranding = null;
        if ($selectedClient) {
            $clientBranding = [
                'company_name' => $selectedClient->company_name,
                'display_name_override' => $selectedClient->display_name_override,
                'logo_path' => $selectedClient->logo_path,
                'accent_color' => $selectedClient->accent_color,
                'registered_city' => $selectedClient->registered_city,
                'registered_state' => $selectedClient->registered_state,
                'gstin' => $selectedClient->gstin,
                'payslip_template' => $selectedClient->payslip_template ?: 'standard',
                'payslip_visible_sections' => $selectedClient->payslip_visible_sections ?: [],
            ];
        }

        return \Inertia\Inertia::render('Payroll/Payslip', [
            'items' => $items,
            'clients' => $clients,
            'selectedClientId' => $selectedClientId ? (int)$selectedClientId : null,
            'selectedMonth' => $selectedMonth,
            'clientBranding' => $clientBranding,
            'lockedRun' => $lockedRun ? [
                'id' => $lockedRun->id,
                'status' => $lockedRun->status,
                'payslip_released_at' => $lockedRun->payslip_released_at,
                'resend_count' => $lockedRun->resend_count ?? 0,
                'released_by_user_name' => $lockedRun->payslip_released_by ? optional(\App\Models\User::find($lockedRun->payslip_released_by))->name : null,
            ] : null,
        ]);
    }

    /**
     * Show live attendance monitor.
     */
    public function indexLiveMonitor(Request $request)
    {
        $user = $request->user();

        $clientsQuery = \App\Models\Client::where('status', 'active');
        if ($user && $user->role === 'manager') {
            $clientsQuery->whereIn('id', $user->getManagedClientIds());
        }

        $clients = $clientsQuery
            ->select('id', 'company_name')
            ->orderBy('id', 'desc')
            ->get();

        $activeSessionClientId = $request->session()->get('active_client_id', 'all');
        $selectedClientId = $request->has('client_id')
            ? $request->query('client_id')
            : ($activeSessionClientId !== 'all' ? $activeSessionClientId : null);
        $selectedDate = $request->query('date', \Carbon\Carbon::today()->toDateString());

        $query = \App\Models\Employee::where('employees.status', 'active')
            ->join('clients', 'employees.client_id', '=', 'clients.id')
            ->leftJoin('attendance_records', function ($join) use ($selectedDate) {
                $join->on('employees.id', '=', 'attendance_records.employee_id')
                     ->where('attendance_records.attendance_date', '=', $selectedDate);
            });

        if ($user && $user->role === 'manager') {
            $query->whereIn('employees.client_id', $user->getManagedClientIds());
        }

        if ($selectedClientId) {
            $query->where('employees.client_id', $selectedClientId);
        }

        $query->orderBy('employees.id', 'desc');

        $records = $query->select([
            'employees.id as employee_id',
            'employees.full_name as name',
            'employees.employee_code as code',
            'employees.client_id',
            'clients.company_name as clientName',
            'attendance_records.punch_in_time',
            'attendance_records.punch_out_time',
            'attendance_records.hours_worked',
            'attendance_records.status as db_status',
            'attendance_records.source as db_source',
        ])->paginate(20)->withQueryString();

        $tz = \App\Services\SettingsService::get('localization.timezone', 'Asia/Kolkata');

        $punches = $records->through(function ($row) use ($tz) {
            $inTime = '—';
            $outTime = '—';
            $hours = '0h 0m';
            $status = 'absent';
            $source = '—';

            if ($row->punch_in_time) {
                $status = 'present';
                $inCarbon = \Carbon\Carbon::parse($row->punch_in_time)->setTimezone($tz);
                $inTime = $inCarbon->format('h:i A');

                if ($row->punch_out_time) {
                    $outCarbon = \Carbon\Carbon::parse($row->punch_out_time)->setTimezone($tz);
                    $outTime = $outCarbon->format('h:i A');
                } else {
                    $outTime = 'working';
                }

                if ($row->hours_worked !== null) {
                    $totalMinutes = round($row->hours_worked * 60);
                    $h = floor($totalMinutes / 60);
                    $m = $totalMinutes % 60;
                    $hours = "{$h}h {$m}m";
                } else {
                    // Calculate dynamic active duration in the configured timezone if still working
                    $now = \Carbon\Carbon::now($tz);
                    if ($inCarbon->greaterThan($now)) {
                        $hours = "0h 0m";
                    } else {
                        $diffInMinutes = $inCarbon->diffInMinutes($now);
                        $h = floor($diffInMinutes / 60);
                        $m = $diffInMinutes % 60;
                        $hours = "{$h}h {$m}m";
                    }
                }
            }

            if ($row->db_status === 'leave') {
                $status = 'leave';
                $source = '⚪ Leave';
            } elseif ($row->db_source) {
                if ($row->db_source === 'live_punch') {
                    $source = '🟢 Live Punch';
                } elseif ($row->db_source === 'uploaded') {
                    $source = '🔵 Uploaded';
                } elseif ($row->db_source === 'override') {
                    $source = '🟠 Override';
                } else {
                    $source = $row->db_source;
                }
            }

            return [
                'id' => $row->employee_id,
                'client' => $row->client_id,
                'clientName' => $row->clientName,
                'name' => $row->name,
                'code' => $row->code,
                'source' => $source,
                'shift' => 'General Shift (09:00 - 18:00)',
                'in' => $inTime,
                'out' => $outTime,
                'hours' => $hours,
                'status' => $status,
            ];
        });

        return \Inertia\Inertia::render('Payroll/LiveAttendanceMonitor', [
            'clients' => $clients,
            'punches' => $punches,
            'selectedClientId' => $selectedClientId ? (int) $selectedClientId : '',
            'selectedDate' => $selectedDate,
        ]);
    }

    /**
     * Preview single-employee payroll correction.
     */
    public function previewCorrection(Request $request)
    {
        $request->validate([
            'parent_run_id' => 'required|exists:payroll_runs,id',
            'employee_id' => 'required|exists:employees,id',
            'corrected_paid_days' => 'required|numeric|min:0|max:31',
            'corrected_lop_days' => 'required|numeric|min:0|max:31',
        ]);

        $parentRun = PayrollRun::findOrFail($request->parent_run_id);
        $this->authorizeClientAccess($parentRun->client_id);
        $employee = \App\Models\Employee::findOrFail($request->employee_id);

        $service = app(\App\Services\PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview(
            $employee,
            $parentRun,
            (float)$request->corrected_paid_days,
            (float)$request->corrected_lop_days
        );

        return response()->json($preview);
    }

    /**
     * Store single-employee payroll correction into a DRAFT supplementary run.
     */
    public function storeCorrection(Request $request)
    {
        $request->validate([
            'parent_run_id' => 'required|exists:payroll_runs,id',
            'employee_id' => 'required|exists:employees,id',
            'corrected_paid_days' => 'required|numeric|min:0|max:31',
            'corrected_lop_days' => 'required|numeric|min:0|max:31',
            'reason' => 'nullable|string|max:500',
            'employee_query_id' => 'nullable|exists:employee_queries,id',
        ]);

        $parentRun = PayrollRun::findOrFail($request->parent_run_id);
        $this->authorizeClientAccess($parentRun->client_id);
        $employee = \App\Models\Employee::findOrFail($request->employee_id);

        $service = app(\App\Services\PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview(
            $employee,
            $parentRun,
            (float)$request->corrected_paid_days,
            (float)$request->corrected_lop_days
        );

        $service->applyCorrection(
            $employee,
            $parentRun,
            $preview,
            $request->reason ?? 'Manual payroll correction',
            $request->employee_query_id ? (int)$request->employee_query_id : null
        );

        return redirect()->back()->with('success', 'Payroll correction added to draft supplementary run successfully.');
    }

    /**
     * Download template for batch payroll correction.
     */
    public function downloadCorrectionTemplate(Request $request)
    {
        $parentRunId = $request->query('parent_run_id');
        $rows = [];
        $context = null;
        $parentRun = null;

        if ($parentRunId) {
            $parentRun = PayrollRun::find($parentRunId);
            if ($parentRun) {
                $this->authorizeClientAccess($parentRun->client_id);

                $context = app(\App\Services\AttendanceUploadValidationService::class)->calculateWorkingDaysContext(
                    $parentRun->client_id,
                    $parentRun->payroll_month
                );

                $allRunIds = $parentRun->children()->pluck('id')->prepend($parentRun->id)->toArray();

                $rawItems = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
                    ->whereIn('payroll_run_id', $allRunIds)
                    ->select('payroll_run_items.*', 'payroll_run_items.id as id', 'employees.full_name', 'employees.employee_code')
                    ->orderBy('payroll_run_items.id', 'asc')
                    ->get();

                $consolidatedItems = $this->consolidateItemsForDisplay($rawItems);

                foreach ($consolidatedItems as $item) {
                    if (!$item->is_excluded) {
                        $rows[] = [
                            'target_month' => $parentRun ? $parentRun->payroll_month : '2026-07-01',
                            'employee_code' => $item->employee_code,
                            'days_present' => (float)$item->paid_days,
                            'days_lop' => (float)$item->lop_days,
                            'reason' => 'Correction reason example',
                        ];
                    }
                }
            }
        }

        if (empty($rows)) {
            $rows[] = [
                'target_month' => '2026-07-01',
                'employee_code' => 'TEC-101',
                'days_present' => 30,
                'days_lop' => 0,
                'reason' => 'Correction reason example',
            ];
        }

        $tempPath = storage_path('app/temp_corr_tmpl_' . \Illuminate\Support\Str::random(16) . '.xlsx');
        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($tempPath, 'xlsx', function ($spoutWriter) {
            $options = $spoutWriter->getOptions();
            if (method_exists($options, 'setColumnWidth')) {
                $options->setColumnWidth(35.0, 1);
                $options->setColumnWidth(75.0, 2);
            }
        });

        $headerStyle = (new \OpenSpout\Common\Entity\Style\Style())
            ->setFontBold()
            ->setFontSize(11)
            ->setFontColor(\OpenSpout\Common\Entity\Style\Color::WHITE)
            ->setBackgroundColor('1F3864');

        // --- SHEET 1: "Reference Info & Rules" (FIRST TAB) ---
        $writer->nameCurrentSheet('Reference Info & Rules');

        if ($context) {
            $reqSlots = $context['working_days_slots'] ?? 26;

            // Section 1: Client & Payroll Cycle Timing
            $writer->addRow(['Section' => '--- CLIENT & PAYROLL CYCLE TIMING ---', 'Details' => ''], $headerStyle);
            $writer->addRow(['Section' => 'Target Client', 'Details' => $context['client_name'] ?? 'N/A']);
            $writer->addRow(['Section' => 'Payroll Target Month', 'Details' => ($context['month_label'] ?? '') . ' (' . ($parentRun ? $parentRun->payroll_month : '') . ')']);
            $writer->addRow(['Section' => 'Cycle Ends', 'Details' => $context['cycle_ends_formatted'] ?? 'N/A']);
            $writer->addRow(['Section' => 'Target Lock Date', 'Details' => $context['target_lock_date_formatted'] ?? 'N/A']);
            $writer->addRow(['Section' => 'Target Salary Credit', 'Details' => $context['target_salary_credit_formatted'] ?? 'N/A']);
            $writer->addRow(['Section' => '', 'Details' => '']);

            // Section 2: Working Days Breakdown
            $writer->addRow(['Section' => '--- ATTENDANCE BREAKDOWN & RULES ---', 'Details' => ''], $headerStyle);
            $writer->addRow(['Section' => 'Total Calendar Days', 'Details' => (string)($context['total_calendar_days'] ?? 30)]);
            $writer->addRow(['Section' => 'Off-Days Pattern', 'Details' => ($context['off_days_label'] ?? 'Sunday') . ' (' . ($context['off_days_count'] ?? 0) . ' off days)']);
            $writer->addRow(['Section' => 'Workday Holidays Count', 'Details' => (string)($context['workday_holiday_count'] ?? 0)]);
            $writer->addRow(['Section' => 'Required Working Days Slots', 'Details' => (string)($reqSlots)]);
            $writer->addRow(['Section' => '', 'Details' => '']);

            // Section 3: Configured Holidays
            if (!empty($context['holidays'])) {
                $writer->addRow(['Section' => '--- CONFIGURABLE HOLIDAYS ---', 'Details' => ''], $headerStyle);
                foreach ($context['holidays'] as $h) {
                    $offText = $h['is_off_day'] ? ' (Falls on Weekly Off)' : ' (Paid Holiday)';
                    $writer->addRow(['Section' => $h['date'], 'Details' => $h['name'] . $offText]);
                }
                $writer->addRow(['Section' => '', 'Details' => '']);
            }

            // Section 4: Employees with Custom Off-Day Patterns
            if ($parentRun && $parentRun->client_id) {
                $clientModel = \App\Models\Client::find($parentRun->client_id);
                $clientDefaultPattern = strtolower($clientModel?->weekly_off_pattern ?? 'sat,sun');

                $overrideEmployees = \App\Models\Employee::where('client_id', $parentRun->client_id)
                    ->where('status', 'active')
                    ->whereNotNull('weekly_off_pattern')
                    ->where('weekly_off_pattern', '!=', '')
                    ->where('weekly_off_pattern', '!=', $clientDefaultPattern)
                    ->get();

                if ($overrideEmployees->isNotEmpty()) {
                    $writer->addRow(['Section' => '--- EMPLOYEES WITH CUSTOM OFF-DAY PATTERNS ---', 'Details' => ''], $headerStyle);
                    $writer->addRow([
                        'Section' => 'Special Rule Note',
                        'Details' => 'Custom weekly off pattern. Required working days differ from client default.',
                    ]);

                    foreach ($overrideEmployees as $empOverride) {
                        $empContext = app(\App\Services\AttendanceUploadValidationService::class)->calculateWorkingDaysContext($parentRun->client_id, $parentRun->payroll_month, $empOverride);
                        $writer->addRow([
                            'Section' => $empOverride->employee_code . ' (' . $empOverride->full_name . ')',
                            'Details' => $empContext['off_days_label'] . ' → Required Working Days: ' . $empContext['working_days_slots'],
                        ]);
                    }
                    $writer->addRow(['Section' => '', 'Details' => '']);
                }

                // Section 4B: Mid-Month Joiners & Partial-Month Tracking Employees
                $monthStartCorr = \Carbon\Carbon::parse($parentRun->payroll_month)->startOfMonth();
                $monthEndCorr = $monthStartCorr->copy()->endOfMonth();
                $allClientEmps = \App\Models\Employee::where('client_id', $parentRun->client_id)->where('status', 'active')->get();
                $midMonthCorrList = [];

                foreach ($allClientEmps as $sampleEmp) {
                    $empStart = \Carbon\Carbon::parse($sampleEmp->date_of_joining)->startOfDay();
                    if (!empty($sampleEmp->attendance_tracking_start_date)) {
                        $atsd = \Carbon\Carbon::parse($sampleEmp->attendance_tracking_start_date)->startOfDay();
                        if ($atsd->gt($empStart)) {
                            $empStart = $atsd->copy();
                        }
                    }
                    if ($empStart->gt($monthStartCorr) && $empStart->lte($monthEndCorr)) {
                        $empCtx = app(\App\Services\AttendanceUploadValidationService::class)->calculateWorkingDaysContext($parentRun->client_id, $parentRun->payroll_month, $sampleEmp);
                        $midMonthCorrList[] = [
                            'emp' => $sampleEmp,
                            'start_date' => $empStart->format('M d, Y'),
                            'total_slots' => $empCtx['working_days_slots'],
                            'punches' => $empCtx['existing_punches_count'],
                            'slots' => $empCtx['net_available_slots'],
                        ];
                    }
                }

                if (!empty($midMonthCorrList)) {
                    $writer->addRow(['Section' => '--- MID-MONTH JOINERS & PARTIAL-MONTH TRACKING EMPLOYEES ---', 'Details' => ''], $headerStyle);
                    $writer->addRow([
                        'Section' => 'Special Joining Note',
                        'Details' => 'Joined mid-month. Max available working days are lower than full month slots.',
                    ]);

                    foreach ($midMonthCorrList as $mm) {
                        $punchNote = $mm['punches'] > 0 ? " ({$mm['total_slots']} Total - {$mm['punches']} Live Punches)" : '';
                        $writer->addRow([
                            'Section' => $mm['emp']->employee_code . ' (' . $mm['emp']->full_name . ')',
                            'Details' => 'Joined: ' . $mm['start_date'] . ' | Max Working Days: ' . $mm['slots'] . $punchNote,
                        ]);
                    }
                    $writer->addRow(['Section' => '', 'Details' => '']);
                }

                // Section 4C: Full-Month Employees with Existing Live Punches
                $punchedFullMonthCorr = [];
                foreach ($allClientEmps as $sampleEmp) {
                    $empStart = \Carbon\Carbon::parse($sampleEmp->date_of_joining)->startOfDay();
                    if (!empty($sampleEmp->attendance_tracking_start_date)) {
                        $atsd = \Carbon\Carbon::parse($sampleEmp->attendance_tracking_start_date)->startOfDay();
                        if ($atsd->gt($empStart)) {
                            $empStart = $atsd->copy();
                        }
                    }
                    $isMidMonth = $empStart->gt($monthStartCorr) && $empStart->lte($monthEndCorr);
                    if (!$isMidMonth) {
                        $empCtx = app(\App\Services\AttendanceUploadValidationService::class)->calculateWorkingDaysContext($parentRun->client_id, $parentRun->payroll_month, $sampleEmp);
                        if ($empCtx['existing_punches_count'] > 0) {
                            $punchedFullMonthCorr[] = [
                                'emp' => $sampleEmp,
                                'total_slots' => $empCtx['working_days_slots'],
                                'punches' => $empCtx['existing_punches_count'],
                                'slots' => $empCtx['net_available_slots'],
                            ];
                        }
                    }
                }

                if (!empty($punchedFullMonthCorr)) {
                    $writer->addRow(['Section' => '--- EMPLOYEES WITH EXISTING LIVE PUNCHES ---', 'Details' => ''], $headerStyle);
                    $writer->addRow([
                        'Section' => 'Live Punch Note',
                        'Details' => 'These employees have existing live punches logged. Remaining available days are adjusted below.',
                    ]);

                    foreach ($punchedFullMonthCorr as $pfm) {
                        $writer->addRow([
                            'Section' => $pfm['emp']->employee_code . ' (' . $pfm['emp']->full_name . ')',
                            'Details' => 'Max Working Days: ' . $pfm['slots'] . ' (' . $pfm['total_slots'] . ' Total - ' . $pfm['punches'] . ' Live Punches)',
                        ]);
                    }
                    $writer->addRow(['Section' => '', 'Details' => '']);
                }
            }

            // Section 5: Instruction Rule
            $writer->addRow(['Section' => '--- HOW TO FILL THIS SHEET ---', 'Details' => ''], $headerStyle);
            $writer->addRow(['Section' => 'Data Entry Instructions', 'Details' => 'In Sheet 2, enter working days + LOP. Total (present + LOP) must match required days for each employee.']);
        } else {
            $writer->addRow(['Section' => '--- HOW TO FILL THIS SHEET ---', 'Details' => ''], $headerStyle);
            $writer->addRow(['Section' => 'Data Entry Instructions', 'Details' => 'In Sheet 2, enter working days + LOP.']);
        }

        // --- SHEET 2: "Attendance Entry" (SECOND TAB) ---
        $writer->addNewSheetAndMakeItCurrent('Attendance Entry');

        foreach ($rows as $row) {
            $writer->addRow($row);
        }

        return response()->download($tempPath, 'Batch_Correction_Template.xlsx')->deleteFileAfterSend(true);
    }

    /**
     * Parse uploaded correction file (.xlsx/.csv) without writing to DB.
     */
    public function importBatchCorrection(Request $request)
    {
        $request->validate([
            'parent_run_id' => 'required|exists:payroll_runs,id',
            'file' => 'required|file|mimes:csv,xlsx,xls,txt|max:5120',
        ]);

        $parentRun = PayrollRun::findOrFail($request->parent_run_id);
        $this->authorizeClientAccess($parentRun->client_id);
        $file = $request->file('file');

        $service = app(\App\Services\PayrollCorrectionService::class);
        $parsedRows = $service->parseCorrectionFile($file->getRealPath(), $parentRun);

        return response()->json([
            'success' => true,
            'items' => $parsedRows,
        ]);
    }

    /**
     * Preview batch payroll correction across multiple employees.
     */
    public function previewBatchCorrection(Request $request)
    {
        $request->validate([
            'parent_run_id' => 'required|exists:payroll_runs,id',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'exists:employees,id',
            'days_overrides' => 'nullable|array',
        ]);

        $parentRun = PayrollRun::findOrFail($request->parent_run_id);
        $this->authorizeClientAccess($parentRun->client_id);

        $service = app(\App\Services\PayrollCorrectionService::class);
        $preview = $service->calculateBatchPreview(
            $parentRun,
            $request->employee_ids ?? [],
            $request->days_overrides ?? []
        );

        return response()->json($preview);
    }

    /**
     * Store batch payroll correction into a single DRAFT supplementary run.
     */
    public function storeBatchCorrection(Request $request)
    {
        $request->validate([
            'parent_run_id' => 'required|exists:payroll_runs,id',
            'reason' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.employee_id' => 'required|exists:employees,id',
            'items.*.corrected_paid_days' => 'required|numeric|min:0|max:31',
            'items.*.corrected_lop_days' => 'required|numeric|min:0|max:31',
            'items.*.reason' => 'nullable|string|max:500',
            'items.*.employee_query_id' => 'nullable|exists:employee_queries,id',
        ]);

        $parentRun = PayrollRun::findOrFail($request->parent_run_id);
        $this->authorizeClientAccess($parentRun->client_id);

        $service = app(\App\Services\PayrollCorrectionService::class);
        $service->applyBatchCorrection($parentRun, $request->items, $request->reason ?? 'Batch payroll correction');

        return redirect()->back()->with('success', 'Batch payroll corrections added to draft supplementary run successfully.');
    }

    /**
     * Consolidate payroll run items across parent and child supplementary runs for display.
     * 
     * Applies base items (parent + new-hire supplementary) and ONLY the latest correction delta
     * per original payroll run item, avoiding additive stacking of multiple corrections.
     * Also resolves latest metadata (exclusion_reason, warning_notes) across all items.
     *
     * @param \Illuminate\Support\Collection $rawItems
     * @return \Illuminate\Support\Collection
     */
    private function consolidateItemsForDisplay(\Illuminate\Support\Collection $rawItems): \Illuminate\Support\Collection
    {
        return app(\App\Services\PayrollCorrectionService::class)->consolidateItemsForDisplay($rawItems);
    }
}
