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
            $run->update([
                'status' => 'locked',
                'locked_at' => now(),
            ]);

            // Trigger invoice generation upon locking
            $invoiceService = app(\App\Services\InvoiceGenerationService::class);
            $invoiceService->generateForRun($run);

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

        // Get all employee IDs that were excluded in the parent run
        $excludedEmployeeIds = \Illuminate\Support\Facades\DB::table('payroll_run_items')
            ->where('payroll_run_id', $parent->id)
            ->where('is_excluded', true)
            ->pluck('employee_id');

        if ($excludedEmployeeIds->isEmpty()) {
            return redirect()->back()->with('error', 'No excluded employees found in the parent run.');
        }

        $client = \App\Models\Client::findOrFail($parent->client_id);
        $employees = \App\Models\Employee::whereIn('id', $excludedEmployeeIds)->get();

        $monthStart = \Carbon\Carbon::parse($parent->payroll_month)->startOfMonth()->toDateString();
        $monthEnd = \Carbon\Carbon::parse($parent->payroll_month)->endOfMonth()->toDateString();

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
}
