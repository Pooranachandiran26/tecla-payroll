<?php

namespace App\Http\Controllers;

use App\Models\PayrollRun;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayrollController extends Controller
{
    /**
     * Approve a payroll run.
     */
    public function approve($id)
    {
        $run = PayrollRun::findOrFail($id);

        if (in_array($run->status, ['approved', 'locked'])) {
            return redirect()->back()->with('error', 'This payroll run is already approved or locked.');
        }

        try {
            $run->update([
                'status' => 'approved',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);
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

        if ($run->status === 'locked') {
            return redirect()->back()->with('error', 'This payroll run is already locked.');
        }

        if ($run->status !== 'approved') {
            return redirect()->back()->with('error', 'Only approved payroll runs can be locked.');
        }

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($run) {
                $run->update([
                    'status' => 'locked',
                    'locked_at' => now(),
                ]);

                // Trigger invoice generation upon locking
                $invoiceService = app(\App\Services\InvoiceGenerationService::class);
                $invoiceService->generateForRun($run);
            });

            return redirect()->back()->with('success', 'Payroll run locked and invoices generated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Run supplementary payroll for previously excluded employees.
     */
    public function runSupplementary($id)
    {
        $parent = PayrollRun::findOrFail($id);

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
        $employees = \App\Models\Employee::whereIn('id', $targetEmployeeIds)->get();

        // 1. Create a draft supplementary run
        $supplementaryRun = PayrollRun::create([
            'client_id' => $parent->client_id,
            'payroll_month' => $parent->payroll_month,
            'status' => 'draft',
            'is_supplementary_run' => true,
            'parent_run_id' => $parent->id,
            'processed_by' => Auth::id(),
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $eligibilityService = app(\App\Services\PayrollEligibilityService::class);
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

        try {
            $run = \Illuminate\Support\Facades\DB::transaction(function () use ($clientId, $payrollMonth) {
                // Lock for concurrency
                $existing = PayrollRun::where('client_id', $clientId)
                    ->where('payroll_month', $payrollMonth)
                    ->lockForUpdate()
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
                    ]);
                }

                $client = \App\Models\Client::findOrFail($clientId);
                $employees = \App\Models\Employee::where('client_id', $clientId)
                    ->where('status', 'active')
                    ->get();

                if ($employees->count() > 500) {
                    throw new \Exception("Roster exceeds the 500-employee limit for synchronous processing.");
                }

                $monthStart = \Carbon\Carbon::parse($payrollMonth)->startOfMonth()->toDateString();
                $monthEnd = \Carbon\Carbon::parse($payrollMonth)->endOfMonth()->toDateString();

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
        $clients = \App\Models\Client::where('status', 'active')
            ->select('id', 'company_name')
            ->get();
        
        $selectedClientId = $request->query('client_id', $clients->first()?->id);
        
        $defaultMonth = now()->subMonth()->startOfMonth()->toDateString();
        $selectedMonth = $request->query('payroll_month', $defaultMonth);

        $run = null;
        $items = [];
        $preflight = [];
        $client = null;

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
                ->first();

            if ($run) {
                $allRunIds = $run->children()->pluck('id')->prepend($run->id)->toArray();

                $items = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
                    ->whereIn('payroll_run_id', $allRunIds)
                    ->select('payroll_run_items.*', 'employees.full_name', 'employees.employee_code')
                    ->orderBy('payroll_run_items.id', 'desc')
                    ->get()
                    ->unique('employee_id')
                    ->values();

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
        $clients = \App\Models\Client::where('status', 'active')
            ->select('id', 'company_name')
            ->get();

        $selectedClientId = $request->query('client_id', $clients->first()?->id);
        
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
                ->first();

            if ($run) {
                $allRunIds = $run->children()->pluck('id')->prepend($run->id)->toArray();

                $items = \Illuminate\Support\Facades\DB::table('payroll_run_items')
                    ->join('employees', 'payroll_run_items.employee_id', '=', 'employees.id')
                    ->whereIn('payroll_run_id', $allRunIds)
                    ->select('payroll_run_items.*', 'employees.full_name', 'employees.employee_code')
                    ->orderBy('payroll_run_items.id', 'desc')
                    ->get()
                    ->unique('employee_id')
                    ->values();

                $newHires = $run->getNewHireCandidates()->map(fn($emp) => [
                    'id' => $emp->id,
                    'full_name' => $emp->full_name,
                    'employee_code' => $emp->employee_code,
                    'date_of_joining' => $emp->date_of_joining,
                ])->toArray();

                $pendingSupplementaryRuns = $run->children()
                    ->where('status', '!=', 'locked')
                    ->get(['id', 'status', 'created_at', 'total_employees_processed', 'total_employees_excluded', 'total_gross_earnings', 'total_net_disbursement'])
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
                }
            }
        }

        return \Inertia\Inertia::render('Payroll/PayrollApproval', [
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
     * List generated invoices.
     */
    public function indexInvoices(Request $request)
    {
        $invoices = \App\Models\Invoice::with(['client', 'branch'])
            ->orderBy('created_at', 'desc')
            ->get();

        return \Inertia\Inertia::render('Invoicing/InvoicesList', [
            'invoices' => $invoices,
        ]);
    }

    /**
     * List finalized payslips.
     */
    public function indexPayslips(Request $request)
    {
        $clients = \App\Models\Client::where('status', 'active')
            ->select('id', 'company_name')
            ->get();

        $selectedClientId = $request->query('client_id');
        if (!$selectedClientId && $clients->isNotEmpty()) {
            $selectedClientId = $clients->first()->id;
        }

        $selectedMonth = $request->query('payroll_month');
        if (!$selectedMonth) {
            $latestRun = \App\Models\PayrollRun::where('status', 'locked')->latest('payroll_month')->first();
            $selectedMonth = $latestRun ? $latestRun->payroll_month : '2026-07-01';
        }

        $lockedRunIds = \App\Models\PayrollRun::where('status', 'locked')
            ->where('payroll_month', $selectedMonth)
            ->when($selectedClientId, function ($query) use ($selectedClientId) {
                $query->where('client_id', $selectedClientId);
            })
            ->pluck('id');

        $runItems = \App\Models\PayrollRunItem::with(['employee', 'payrollRun'])
            ->whereIn('payroll_run_id', $lockedRunIds)
            ->where('is_excluded', false)
            ->orderBy('id', 'desc')
            ->get()
            ->unique('employee_id')
            ->values();

        $items = $runItems->map(function ($item) {
            $employee = $item->employee;
            return array_merge($item->toArray(), [
                'full_name' => $employee ? $employee->full_name : '—',
                'employee_code' => $employee ? $employee->employee_code : '—',
                'designation' => $employee ? $employee->designation : '—',
                'bank_name' => $employee ? $employee->bank_name : '—',
                'bank_account_number' => $employee ? $employee->bank_account_number : '—',
                'employment_model' => $employee ? $employee->employment_model : '—',
            ]);
        });

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
            ];
        }

        return \Inertia\Inertia::render('Payroll/Payslip', [
            'items' => $items,
            'clients' => $clients,
            'selectedClientId' => $selectedClientId ? (int)$selectedClientId : null,
            'selectedMonth' => $selectedMonth,
            'clientBranding' => $clientBranding,
        ]);
    }

    /**
     * Show live attendance monitor.
     */
    public function indexLiveMonitor(Request $request)
    {
        $clients = \App\Models\Client::where('status', 'active')
            ->select('id', 'company_name')
            ->get();

        $selectedClientId = $request->query('client_id');
        $selectedDate = $request->query('date', \Carbon\Carbon::today()->toDateString());

        $query = \App\Models\Employee::where('employees.status', 'active')
            ->join('clients', 'employees.client_id', '=', 'clients.id')
            ->leftJoin('attendance_records', function ($join) use ($selectedDate) {
                $join->on('employees.id', '=', 'attendance_records.employee_id')
                     ->where('attendance_records.attendance_date', '=', $selectedDate);
            });

        if ($selectedClientId) {
            $query->where('employees.client_id', $selectedClientId);
        }

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
        ])->get();

        $tz = \App\Services\SettingsService::get('localization.timezone', 'Asia/Kolkata');

        $punches = $records->map(function ($row) use ($tz) {
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
}
