<?php

namespace Database\Seeders;

use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use App\Services\MonthlyPayrollCalculator;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class Phase123VerificationSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Get or create Admin user for operations
        $admin = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 1: CLIENT — "Verification Corp" with non-default settings
        // ═══════════════════════════════════════════════════════════════════════
        // Clean up previous verification run if exists
        $existingClient = Client::where('client_code', 'VERIF001')->first();
        if ($existingClient) {
            $empIds = Employee::where('client_id', $existingClient->id)->pluck('id');
            AttendanceRecord::whereIn('employee_id', $empIds)->delete();
            EmployeeAttendanceOverride::whereIn('employee_id', $empIds)->delete();
            PayrollRun::where('client_id', $existingClient->id)->delete();
            Holiday::where('client_id', $existingClient->id)->delete();
            Employee::where('client_id', $existingClient->id)->delete();
            ClientBranch::where('client_id', $existingClient->id)->delete();
            $existingClient->forceDelete();
        }

        $client = Client::create([
            'company_name' => 'Verification Corp',
            'client_code' => 'VERIF001',
            'industry' => 'Technology',
            'contract_type' => 'agency',
            'contract_start_date' => '2024-01-01',
            'contract_end_date' => '2027-12-31',
            'billing_model' => 'markup',
            'markup_percentage' => 10.0,
            'lop_basis_days' => '27',              // PHASE 1: Non-default 27 LOP basis
            'weekly_off_pattern' => 'fri,sat',      // PHASE 3: Non-default fri,sat off pattern
            'status' => 'active',
            'primary_poc_name' => 'Verif Manager',
            'primary_poc_email' => 'verif@corp.com',
            'primary_poc_phone' => '9876543210',
            'company_type' => 'pvt_ltd',
            'country' => 'India',
            'pan_number' => 'VERIF1234F',
            'gstin' => '27VERIF1234F1Z5',
            'registered_address_line_1' => '123 Verif Tech Park',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400001',
        ]);

        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Headquarters',
            'address_line_1' => '123 Verif Tech Park',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'pin_code' => '400001',
            'is_head_office' => true,
            'is_primary_billing_branch' => true,
        ]);

        // Add 2 Real Holidays for August 2026
        $holidayMandatory = Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        $holidayOptional = Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-28',
            'name' => 'Floating Harvest Festival',
            'is_optional' => true,
        ]);

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 2: EMPLOYEE A — "Long Tenure, New to Software" (Phase 2)
        // ═══════════════════════════════════════════════════════════════════════
        $employeeA = Employee::create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-A001',
            'full_name' => 'Employee A (Long Tenure)',
            'designation' => 'Senior Engineer',
            'employment_model' => 'agency_contract',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2023-08-01',                      // 3 years ago
            'attendance_tracking_start_date' => '2026-08-01',       // PHASE 2: Tracking starts Aug 1, 2026
            'lop_basis_days' => '27',                              // PHASE 1: Inherited 27 LOP basis
            'weekly_off_pattern' => null,                          // PHASE 3: Inherits client's fri,sat
            'basic_pay' => 27000.00,                               // Easy ₹1000/day LOP calculation
            'hra' => 5000.00,
            'conveyance' => 2000.00,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'status' => 'active',
            'gender' => 'male',
            'personal_email' => 'employee.a@verif.com',
            'phone_number' => '9999900001',
            'pan_number' => 'EMPAA1111A',
            'aadhaar_number' => '111122223333',
            'bank_name' => 'State Bank of India',
            'bank_account_number' => '111100002222',
            'account_holder_name' => 'Employee A (Long Tenure)',
            'bank_ifsc' => 'SBIN0001234',
            'bank_branch' => 'Mumbai Main',
            'uan_mode' => 'new',
        ]);

        // Create User account for Employee A
        User::updateOrCreate(
            ['email' => 'employee.a@verif.com'],
            [
                'name' => 'Employee A (Long Tenure)',
                'role' => 'employee',
                'employee_id' => $employeeA->id,
                'password' => bcrypt('password'),
                'status' => 'active',
            ]
        );

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 3: EMPLOYEE B — "Personal Pattern Override" (Phase 3)
        // ═══════════════════════════════════════════════════════════════════════
        $employeeB = Employee::create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-B002',
            'full_name' => 'Employee B (Custom Off Pattern)',
            'designation' => 'Lead Architect',
            'employment_model' => 'agency_contract',
            'date_of_birth' => '1992-05-15',
            'date_of_joining' => '2024-01-01',
            'attendance_tracking_start_date' => null,
            'lop_basis_days' => '30',                              // PHASE 1: Custom 30 LOP basis
            'weekly_off_pattern' => 'sun',                          // PHASE 3: Overrides client's fri,sat with 'sun'
            'basic_pay' => 30000.00,                               // Easy ₹1000/day LOP calculation
            'hra' => 5000.00,
            'conveyance' => 2000.00,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'status' => 'active',
            'gender' => 'female',
            'personal_email' => 'employee.b@verif.com',
            'phone_number' => '9999900002',
            'pan_number' => 'EMPBB2222B',
            'aadhaar_number' => '444455556666',
            'bank_name' => 'HDFC Bank',
            'bank_account_number' => '333300004444',
            'account_holder_name' => 'Employee B (Custom Off Pattern)',
            'bank_ifsc' => 'HDFC0001234',
            'bank_branch' => 'Mumbai Fort',
            'uan_mode' => 'new',
        ]);

        // Create User account for Employee B
        User::updateOrCreate(
            ['email' => 'employee.b@verif.com'],
            [
                'name' => 'Employee B (Custom Off Pattern)',
                'role' => 'employee',
                'employee_id' => $employeeB->id,
                'password' => bcrypt('password'),
                'status' => 'active',
            ]
        );

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 4: DAY SWAP (Phase 3) for Employee B — Worked Sun Aug 9, Off Wed Aug 12
        // ═══════════════════════════════════════════════════════════════════════
        $swapWorkRow = EmployeeAttendanceOverride::create([
            'employee_id' => $employeeB->id,
            'override_date' => '2026-08-09',                     // Sunday (normal off-day)
            'attendance_day_type' => 'work_day',                 // Worked off-day
            'reason' => 'Swapped worked Sunday Aug 9 with Wednesday Aug 12 off',
            'status' => 'approved',
            'swap_target_date' => '2026-08-12',
            'approved_by' => $admin->id,
            'approved_at' => now(),
        ]);

        $swapOffRow = EmployeeAttendanceOverride::create([
            'employee_id' => $employeeB->id,
            'override_date' => '2026-08-12',                     // Wednesday (normal work-day)
            'attendance_day_type' => 'weekly_off',                // Taken off
            'reason' => 'Swapped worked Sunday Aug 9 with Wednesday Aug 12 off',
            'status' => 'approved',
            'swap_target_date' => '2026-08-09',
            'approved_by' => $admin->id,
            'approved_at' => now(),
        ]);

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 5: ATTENDANCE RECORDS for August 2026 (Aug 1 to Aug 31)
        // ═══════════════════════════════════════════════════════════════════════
        // Employee A: Off-days = fri,sat (Aug 1, 7, 8, 14, 15, 21, 22, 28, 29)
        // Work-days = sun..thu.
        // LOP days: Aug 3 (Mon), Aug 4 (Tue) -> NO record
        // Leave day: Aug 10 (Mon) -> status = 'leave'
        // Other work days -> status = 'present'
        for ($d = 1; $d <= 31; $d++) {
            $dateStr = sprintf('2026-08-%02d', $d);
            $dayOfWeek = strtolower(Carbon::parse($dateStr)->format('D')); // sun, mon, tue, wed, thu, fri, sat

            $isEmpAOff = in_array($dayOfWeek, ['fri', 'sat']);

            if (!$isEmpAOff) {
                if (in_array($dateStr, ['2026-08-03', '2026-08-04'])) {
                    // Genuine LOP — NO record
                } elseif ($dateStr === '2026-08-10') {
                    // Approved Leave
                    AttendanceRecord::create([
                        'employee_id' => $employeeA->id,
                        'attendance_date' => $dateStr,
                        'status' => 'on_leave',
                        'punch_in_time' => "{$dateStr} 09:00:00",
                        'punch_out_time' => "{$dateStr} 18:00:00",
                        'source' => 'live_punch',
                    ]);
                } else {
                    // Present
                    AttendanceRecord::create([
                        'employee_id' => $employeeA->id,
                        'attendance_date' => $dateStr,
                        'status' => 'present',
                        'punch_in_time' => "{$dateStr} 09:00:00",
                        'punch_out_time' => "{$dateStr} 18:00:00",
                        'source' => 'live_punch',
                    ]);
                }
            }
        }

        // Employee B: Off-days = sun (Aug 2, 9, 16, 23, 30).
        // Day Swap: Worked Sun Aug 9 -> Present record. Off Wed Aug 12 -> NO record.
        // LOP days: Aug 17 (Mon), Aug 18 (Tue) -> NO record.
        // Leave day: Aug 24 (Mon) -> status = 'leave'.
        // Other work days -> status = 'present'.
        for ($d = 1; $d <= 31; $d++) {
            $dateStr = sprintf('2026-08-%02d', $d);
            $dayOfWeek = strtolower(Carbon::parse($dateStr)->format('D'));

            if ($dateStr === '2026-08-09') {
                // Swapped worked Sunday! Attendance record present
                AttendanceRecord::create([
                    'employee_id' => $employeeB->id,
                    'attendance_date' => $dateStr,
                    'status' => 'present',
                    'punch_in_time' => "{$dateStr} 09:00:00",
                    'punch_out_time' => "{$dateStr} 18:00:00",
                    'source' => 'live_punch',
                ]);
            } elseif ($dateStr === '2026-08-12') {
                // Swapped Wednesday taken off! NO attendance record
            } elseif (in_array($dateStr, ['2026-08-17', '2026-08-18'])) {
                // Genuine LOP — NO record
            } elseif ($dateStr === '2026-08-24') {
                // Approved Leave
                AttendanceRecord::create([
                    'employee_id' => $employeeB->id,
                    'attendance_date' => $dateStr,
                    'status' => 'on_leave',
                    'punch_in_time' => "{$dateStr} 09:00:00",
                    'punch_out_time' => "{$dateStr} 18:00:00",
                    'source' => 'live_punch',
                ]);
            } elseif ($dayOfWeek !== 'sun') {
                // Regular work day present
                AttendanceRecord::create([
                    'employee_id' => $employeeB->id,
                    'attendance_date' => $dateStr,
                    'status' => 'present',
                    'punch_in_time' => "{$dateStr} 09:00:00",
                    'punch_out_time' => "{$dateStr} 18:00:00",
                    'source' => 'live_punch',
                ]);
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // STEP 6: RUN ACTUAL PAYROLL PROCESSING FOR AUGUST 2026
        // ═══════════════════════════════════════════════════════════════════════
        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'processing',
            'processed_by' => $admin->id,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($employeeA, $payrollRun);
        $calculator->calculateForEmployee($employeeB, $payrollRun);

        $payrollRun->update(['status' => 'approved', 'approved_by' => $admin->id, 'approved_at' => now()]);
    }
}
