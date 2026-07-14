<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Client;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollEligibilityService
{
    /**
     * Checks if an employee is eligible for the payroll run and returns status, exclusions, and warnings.
     *
     * @param Employee $employee
     * @param Client $client
     * @param string $monthStart (Y-m-d)
     * @param string $monthEnd (Y-m-d)
     * @return array
     */
    public function checkEmployee(Employee $employee, Client $client, string $monthStart, string $monthEnd): array
    {
        $exclusions = [];
        $warnings = [];

        // 1. Employee Status Validation
        if ($employee->status !== 'active') {
            $exclusions[] = "Employee status: " . $employee->status;
        }

        // 2. Bank Details Validation
        if (empty($employee->bank_account_number) || empty($employee->bank_ifsc)) {
            $exclusions[] = "Incomplete bank details";
        }

        // 3. Attendance Data & Leave Check
        $attendanceCount = DB::table('attendance_records')
            ->where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$monthStart, $monthEnd])
            ->count();

        if ($attendanceCount === 0) {
            $hasApprovedLeave = DB::table('leave_requests')
                ->where('employee_id', $employee->id)
                ->where('status', 'approved')
                ->where(function($query) use ($monthStart, $monthEnd) {
                    $query->whereBetween('from_date', [$monthStart, $monthEnd])
                          ->orWhereBetween('to_date', [$monthStart, $monthEnd])
                          ->orWhere(function($sub) use ($monthStart, $monthEnd) {
                              $sub->where('from_date', '<=', $monthStart)
                                  ->where('to_date', '>=', $monthEnd);
                          });
                })
                ->exists();

            if (!$hasApprovedLeave) {
                $exclusions[] = "No attendance data";
            }
        }

        // 4. Required Documents Verification Check
        $requiredTypes = $employee->required_document_types;
        $verifiedTypesCount = $employee->documents()
            ->whereIn('document_type', $requiredTypes)
            ->where('status', 'verified')
            ->distinct('document_type')
            ->count('document_type');

        if ($verifiedTypesCount < count($requiredTypes)) {
            $exclusions[] = "Documents not verified";
        }

        // 5. In-progress Exit Check
        $hasInProgressExit = DB::table('employee_exits')
            ->where('employee_id', $employee->id)
            ->whereNull('deleted_at')
            ->where('settlement_status', '!=', 'approved')
            ->exists();

        if ($hasInProgressExit) {
            $exclusions[] = "Employee in exit process";
        }

        // --- WARNING-ONLY FLAGS ---

        // A. Pending Bank Change Request
        $hasPendingBankChange = DB::table('bank_change_requests')
            ->where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPendingBankChange) {
            $warnings[] = "Pending bank change request";
        }

        // B. Mid-month Salary Revision
        $hasSalaryRevision = DB::table('salary_revisions')
            ->where('employee_id', $employee->id)
            ->whereBetween('effective_date', [$monthStart, $monthEnd])
            ->exists();

        if ($hasSalaryRevision) {
            $warnings[] = "Salary revision with effective date inside this payroll month";
        }

        // C. Near ESI Threshold Warning (gross salary between 19000 and 21000)
        $grossSalary = (float)$employee->basic_pay + 
                       (float)$employee->hra + 
                       (float)$employee->conveyance + 
                       (float)$employee->da + 
                       (float)$employee->medical_allowance + 
                       (float)$employee->special_allowance + 
                       (float)$employee->other_additions;

        if ($grossSalary >= 19000 && $grossSalary <= 21000) {
            $warnings[] = "Employee near the ESI ₹21,000 threshold";
        }

        return [
            'is_eligible' => empty($exclusions),
            'exclusions' => $exclusions,
            'warnings' => $warnings,
        ];
    }
}
