<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientLeavePolicy;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\AttendanceRecord;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeavePolicyService
{
    protected AttendanceResolutionService $attendanceResolutionService;
    protected MonthlyPayrollCalculator $monthlyPayrollCalculator;

    public function __construct(
        AttendanceResolutionService $attendanceResolutionService,
        MonthlyPayrollCalculator $monthlyPayrollCalculator
    ) {
        $this->attendanceResolutionService = $attendanceResolutionService;
        $this->monthlyPayrollCalculator = $monthlyPayrollCalculator;
    }

    /**
     * Seed default leave policies for a new or existing client.
     */
    public function seedDefaultPolicies(Client $client): void
    {
        $defaults = [
            [
                'leave_type' => 'sick',
                'policy_name' => 'Sick Leave',
                'annual_quota' => 12.00,
                'accrual_frequency' => 'monthly',
                'monthly_accrual_rate' => 1.00,
                'carry_forward_allowed' => false,
                'max_carry_forward_days' => 0.00,
            ],
            [
                'leave_type' => 'casual',
                'policy_name' => 'Casual Leave',
                'annual_quota' => 12.00,
                'accrual_frequency' => 'monthly',
                'monthly_accrual_rate' => 1.00,
                'carry_forward_allowed' => false,
                'max_carry_forward_days' => 0.00,
            ],
            [
                'leave_type' => 'earned',
                'policy_name' => 'Earned Leave',
                'annual_quota' => 15.00,
                'accrual_frequency' => 'annual_upfront',
                'monthly_accrual_rate' => 1.25,
                'carry_forward_allowed' => true,
                'max_carry_forward_days' => 15.00,
            ],
        ];

        foreach ($defaults as $policyData) {
            ClientLeavePolicy::updateOrCreate(
                ['client_id' => $client->id, 'leave_type' => $policyData['leave_type']],
                $policyData
            );
        }
    }

    /**
     * Calculate working days for a leave span [from_date, to_date].
     * Zero-duplicate delegation to AttendanceResolutionService.
     */
    public function calculateWorkingDaysForSpan(Employee $employee, string $fromDate, string $toDate): float
    {
        $start = Carbon::parse($fromDate)->startOfDay();
        $end = Carbon::parse($toDate)->startOfDay();

        $workingDays = 0.0;
        for ($curr = $start->copy(); $curr->lte($end); $curr->addDay()) {
            if ($this->attendanceResolutionService->isWorkingDay($employee, $curr)) {
                $workingDays += 1.0;
            }
        }

        return $workingDays;
    }

    /**
     * Sync leave balances for all employees of a client for a given year.
     */
    public function syncClientEmployeesBalances(Client $client, int $year): void
    {
        $policies = ClientLeavePolicy::where('client_id', $client->id)
            ->where('is_active', true)
            ->get();

        $employees = Employee::where('client_id', $client->id)
            ->where('status', 'active')
            ->get();

        foreach ($policies as $policy) {
            foreach ($employees as $employee) {
                $balance = EmployeeLeaveBalance::firstOrNew([
                    'employee_id' => $employee->id,
                    'client_leave_policy_id' => $policy->id,
                    'year' => $year,
                ]);

                // Set annual quota & snapshot max carry forward
                $balance->allocated_days = (float)$policy->annual_quota;
                if (!$balance->exists || (float)$balance->snapshot_max_carry_forward_days === 0.0) {
                    $balance->snapshot_max_carry_forward_days = (float)$policy->max_carry_forward_days;
                }
                
                // Dynamically calculate used_days and pending_days from approved/pending leave requests for this year
                $approvedUsed = (float)LeaveRequest::where('employee_id', $employee->id)
                    ->where('leave_type', $policy->leave_type)
                    ->where('status', 'approved')
                    ->whereYear('from_date', $year)
                    ->sum('days_count');

                $pendingDays = (float)LeaveRequest::where('employee_id', $employee->id)
                    ->where('leave_type', $policy->leave_type)
                    ->where('status', 'pending')
                    ->whereYear('from_date', $year)
                    ->sum('days_count');

                $balance->used_days = max((float)$balance->used_days, round($approvedUsed, 2));
                $balance->pending_days = round($pendingDays, 2);

                $carried = (float)$balance->carried_over_days;
                $used = (float)$balance->used_days;
                $pending = (float)$balance->pending_days;
                $balance->remaining_days = round($balance->allocated_days + $carried - $used - $pending, 2);

                $balance->save();
            }
        }
    }

    /**
     * Process an approved leave request:
     * 1. Check locked-period guard (422)
     * 2. Update attendance_records (is_lop = false)
     * 3. Update leave balance (used_days, remaining_days)
     * 4. Auto-recalculate draft payroll if an active draft payroll run exists (Gap #1)
     */
    public function processApprovedLeave(LeaveRequest $request): array
    {
        $employee = Employee::with('client')->findOrFail($request->employee_id);
        $fromDate = Carbon::parse($request->from_date);
        $toDate = Carbon::parse($request->to_date);
        $targetMonthStr = $fromDate->copy()->startOfMonth()->toDateString();
        $monthName = $fromDate->format('F Y');

        // 1. Locked-period Guard Check
        $lockedRun = PayrollRun::where('client_id', $employee->client_id)
            ->where('payroll_month', $targetMonthStr)
            ->where('status', 'locked')
            ->first();

        if ($lockedRun) {
            $msg = "⚠️ Already Locked Period — Payroll for {$monthName} is already locked for this client. Use Payroll Correction instead.";
            throw ValidationException::withMessages([
                'leave' => $msg,
            ]);
        }

        DB::transaction(function () use ($request, $employee, $fromDate, $toDate) {
            // 2. Mark attendance_records as paid leave
            for ($curr = $fromDate->copy(); $curr->lte($toDate); $curr->addDay()) {
                $dateStr = $curr->toDateString();
                if ($this->attendanceResolutionService->isWorkingDay($employee, $curr)) {
                    $existingRecord = AttendanceRecord::where('employee_id', $employee->id)
                        ->where('attendance_date', $dateStr)
                        ->first();

                    if ($existingRecord) {
                        if ($existingRecord->source === 'live_punch') {
                            $existingRecord->update([
                                'status' => 'on_leave',
                                'source' => 'override',
                            ]);
                        } else {
                            $existingRecord->update([
                                'punch_in_time' => null,
                                'punch_out_time' => null,
                                'hours_worked' => null,
                                'status' => 'on_leave',
                                'source' => 'override',
                            ]);
                        }
                    } else {
                        AttendanceRecord::create([
                            'employee_id' => $employee->id,
                            'attendance_date' => $dateStr,
                            'status' => 'on_leave',
                            'source' => 'override',
                        ]);
                    }
                }
            }

            // 3. Update EmployeeLeaveBalance
            $policy = ClientLeavePolicy::where('client_id', $employee->client_id)
                ->where('leave_type', $request->leave_type)
                ->first();

            if ($policy) {
                $balance = EmployeeLeaveBalance::firstOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'client_leave_policy_id' => $policy->id,
                        'year' => $fromDate->year,
                    ],
                    [
                        'allocated_days' => $policy->annual_quota,
                        'snapshot_max_carry_forward_days' => $policy->max_carry_forward_days,
                    ]
                );

                $daysCount = (float)$request->days_count;
                $balance->used_days = round((float)$balance->used_days + $daysCount, 2);
                $balance->remaining_days = round((float)$balance->allocated_days + (float)$balance->carried_over_days - (float)$balance->used_days - (float)$balance->pending_days, 2);
                $balance->save();
            }

            // Update LeaveRequest status
            $request->update([
                'status' => 'approved',
                'approved_by' => auth()->id() ?? $request->approved_by,
                'decided_at' => now(),
            ]);
        });

        // 4. Auto-recalculate draft payroll (Gap #1)
        $draftRun = PayrollRun::where('client_id', $employee->client_id)
            ->where('payroll_month', $targetMonthStr)
            ->whereIn('status', ['draft', 'processing'])
            ->first();

        $recalculated = false;
        if ($draftRun) {
            $item = DB::table('payroll_run_items')
                ->where('payroll_run_id', $draftRun->id)
                ->where('employee_id', $employee->id)
                ->first();

            if ($item) {
                $this->monthlyPayrollCalculator->calculateForEmployee($employee, $draftRun);

                // Update summary totals on payroll_runs
                $totalGross = DB::table('payroll_run_items')->where('payroll_run_id', $draftRun->id)->sum('gross_total');
                $totalNet = DB::table('payroll_run_items')->where('payroll_run_id', $draftRun->id)->sum('net_pay');
                $draftRun->update([
                    'total_gross_earnings' => $totalGross,
                    'total_net_disbursement' => $totalNet,
                ]);

                $recalculated = true;
            }
        }

        return [
            'status' => 200,
            'recalculated' => $recalculated,
            'message' => $recalculated
                ? "Leave Approved — Draft payroll for {$monthName} has been automatically updated."
                : "Leave Approved successfully.",
        ];
    }

    /**
     * Year-end carry-forward rollover logic (Gap #3 protected).
     */
    public function rolloverYearBalances(int $fromYear, int $toYear): void
    {
        $balances = EmployeeLeaveBalance::with('policy')
            ->where('year', $fromYear)
            ->get();

        foreach ($balances as $balance) {
            $policy = $balance->policy;
            if (!$policy || !$policy->carry_forward_allowed) {
                continue;
            }

            // Gap #3 Protection: Use snapshot_max_carry_forward_days from balance row!
            $maxCap = (float)$balance->snapshot_max_carry_forward_days;
            $remaining = (float)$balance->remaining_days;

            $carriedOver = max(0.00, min($remaining, $maxCap));

            $nextBalance = EmployeeLeaveBalance::firstOrNew([
                'employee_id' => $balance->employee_id,
                'client_leave_policy_id' => $balance->client_leave_policy_id,
                'year' => $toYear,
            ]);

            $nextBalance->allocated_days = (float)$policy->annual_quota;
            $nextBalance->carried_over_days = $carriedOver;
            $nextBalance->snapshot_max_carry_forward_days = (float)$policy->max_carry_forward_days;
            $nextBalance->remaining_days = round($nextBalance->allocated_days + $carriedOver - (float)$nextBalance->used_days - (float)$nextBalance->pending_days, 2);
            $nextBalance->save();
        }
    }
}
