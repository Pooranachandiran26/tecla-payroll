<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientLeavePolicy;
use App\Models\Employee;
use App\Models\EmployeeLeaveBalance;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use App\Services\LeavePolicyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class LeavePolicyTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client;
    protected Employee $employee;
    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin_leave_test_' . uniqid() . '@example.com',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Leave Policy Test Client',
            'weekly_off_pattern' => 'sat,sun',
        ]);

        $this->branch = \App\Models\ClientBranch::factory()->create([
            'client_id' => $this->client->id,
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'basic_pay' => 30000,
            'hra' => 15000,
            'date_of_joining' => '2026-01-01',
            'weekly_off_pattern' => 'sat,sun',
            'status' => 'active',
        ]);
    }

    /** 1. Admin can configure policy & sync employee leave balances */
    public function test_admin_can_configure_sick_leave_policy_and_sync_employees(): void
    {
        $response = $this->actingAs($this->adminUser)->post(route('payroll.leave-settings.store'), [
            'client_id' => $this->client->id,
            'leave_type' => 'sick',
            'policy_name' => 'Sick Leave Policy 12D',
            'annual_quota' => 12,
            'accrual_frequency' => 'monthly',
            'carry_forward_allowed' => false,
            'max_carry_forward_days' => 0,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('client_leave_policies', [
            'client_id' => $this->client->id,
            'leave_type' => 'sick',
            'annual_quota' => 12.00,
        ]);

        $this->assertDatabaseHas('employee_leave_balances', [
            'employee_id' => $this->employee->id,
            'allocated_days' => 12.00,
            'remaining_days' => 12.00,
            'year' => (int)date('Y'),
        ]);
    }

    /** 2. Approved leave marks attendance as paid & auto-recalculates draft payroll (Gap #1) */
    public function test_approved_leave_marks_attendance_as_paid_and_recalculates_draft_payroll(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);
        $leavePolicyService->seedDefaultPolicies($this->client);
        $leavePolicyService->syncClientEmployeesBalances($this->client, 2026);

        // Create a DRAFT payroll run for August 2026
        $payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
            'processed_by' => $this->adminUser->id,
            'total_gross_earnings' => 45000,
            'total_net_disbursement' => 45000,
        ]);

        // Seed present attendance records for August 2026 except Aug 3 & Aug 4 (absent)
        for ($day = 1; $day <= 31; $day++) {
            $dStr = sprintf('2026-08-%02d', $day);
            if ($day !== 3 && $day !== 4) {
                \App\Models\AttendanceRecord::create([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $dStr,
                    'status' => 'present',
                    'source' => 'live_punch',
                ]);
            }
        }

        // Create initial payroll item with 2.0 LOP days (simulating 2 absent days)
        $item = PayrollRunItem::create([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 29.0,
            'lop_days' => 2.0,
            'basic_pay' => 28000,
            'hra' => 14000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 42000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 2000,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 40000,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'attendance_source' => 'live_punch',
        ]);

        // Employee submits a 2-day Sick Leave request for Monday 2026-08-03 and Tuesday 2026-08-04
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'sick',
            'from_date' => '2026-08-03',
            'to_date' => '2026-08-04',
            'days_count' => 2.0,
            'reason' => 'Fever and rest',
            'status' => 'pending',
        ]);

        // Approve leave
        $result = $leavePolicyService->processApprovedLeave($leaveRequest);

        $this->assertEquals(200, $result['status']);
        $this->assertTrue($result['recalculated']);

        // Verify attendance records created with status = on_leave
        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-08-03',
            'status' => 'on_leave',
        ]);

        // Verify draft payroll item was auto-recalculated (lop_days reduced to 0.0)
        $freshItem = PayrollRunItem::where('payroll_run_id', $payrollRun->id)
            ->where('employee_id', $this->employee->id)
            ->first();

        $this->assertNotNull($freshItem);
        $this->assertEquals(0.0, (float)$freshItem->lop_days);
        $this->assertGreaterThan(40000, (float)$freshItem->net_pay);
    }

    /** 3. Mid-year policy quota sync preserves historical used_days */
    public function test_mid_year_policy_sync_preserves_used_days(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);
        $leavePolicyService->seedDefaultPolicies($this->client);
        $leavePolicyService->syncClientEmployeesBalances($this->client, 2026);

        $policy = ClientLeavePolicy::where('client_id', $this->client->id)->where('leave_type', 'sick')->first();
        $balance = EmployeeLeaveBalance::where('employee_id', $this->employee->id)->where('client_leave_policy_id', $policy->id)->first();

        // Simulate 4 used sick leave days
        $balance->update([
            'used_days' => 4.0,
            'remaining_days' => 8.0,
        ]);

        // Admin increases annual sick leave quota from 12 to 15 mid-year
        $policy->update(['annual_quota' => 15.0]);
        $leavePolicyService->syncClientEmployeesBalances($this->client, 2026);

        $freshBalance = EmployeeLeaveBalance::find($balance->id);
        $this->assertEquals(15.0, (float)$freshBalance->allocated_days);
        $this->assertEquals(4.0, (float)$freshBalance->used_days); // Preserved!
        $this->assertEquals(11.0, (float)$freshBalance->remaining_days); // 15 - 4 = 11
    }

    /** 4. Manager and Client role cross-client 403 scoping enforcement */
    public function test_manager_and_client_role_scoping_enforcement(): void
    {
        $otherClient = Client::factory()->create(['company_name' => 'Other Client Corp']);

        $clientUser = User::factory()->create([
            'role' => 'client',
            'client_id' => $this->client->id,
            'email' => 'client_user_' . uniqid() . '@example.com',
        ]);

        // Client user trying to access other client's settings -> 403
        $response = $this->actingAs($clientUser)->post(route('payroll.leave-settings.store'), [
            'client_id' => $otherClient->id,
            'leave_type' => 'sick',
            'policy_name' => 'Unauthorized Policy',
            'annual_quota' => 12,
            'accrual_frequency' => 'monthly',
            'carry_forward_allowed' => false,
            'max_carry_forward_days' => 0,
        ]);

        $response->assertStatus(403);
    }

    /** 5. Standard year-end carry forward rollover */
    public function test_year_end_basic_carry_forward_rollover(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);
        $leavePolicyService->seedDefaultPolicies($this->client);
        $leavePolicyService->syncClientEmployeesBalances($this->client, 2026);

        $earnedPolicy = ClientLeavePolicy::where('client_id', $this->client->id)->where('leave_type', 'earned')->first();
        $balance2026 = EmployeeLeaveBalance::where('employee_id', $this->employee->id)->where('client_leave_policy_id', $earnedPolicy->id)->first();

        // 5 days remaining in 2026
        $balance2026->update([
            'used_days' => 10.0,
            'remaining_days' => 5.0,
        ]);

        // Run year-end rollover 2026 -> 2027
        $leavePolicyService->rolloverYearBalances(2026, 2027);

        $balance2027 = EmployeeLeaveBalance::where('employee_id', $this->employee->id)
            ->where('client_leave_policy_id', $earnedPolicy->id)
            ->where('year', 2027)
            ->first();

        $this->assertNotNull($balance2027);
        $this->assertEquals(5.0, (float)$balance2027->carried_over_days);
        $this->assertEquals(20.0, (float)$balance2027->remaining_days); // 15 allocated + 5 carried
    }

    /** 6. Gap #3: Mid-year policy max_carry_forward_days reduction protects earned days */
    public function test_carry_forward_cap_changed_mid_year_protects_earned_days(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);
        $leavePolicyService->seedDefaultPolicies($this->client);

        $earnedPolicy = ClientLeavePolicy::where('client_id', $this->client->id)->where('leave_type', 'earned')->first();
        $earnedPolicy->update(['max_carry_forward_days' => 15.0]);

        $leavePolicyService->syncClientEmployeesBalances($this->client, 2026);

        $balance2026 = EmployeeLeaveBalance::where('employee_id', $this->employee->id)->where('client_leave_policy_id', $earnedPolicy->id)->first();
        $this->assertEquals(15.0, (float)$balance2026->snapshot_max_carry_forward_days);

        // Employee has 10 remaining days at end of 2026
        $balance2026->update([
            'used_days' => 5.0,
            'remaining_days' => 10.0,
        ]);

        // Admin lowers max_carry_forward_days to 5.0 mid-year in 2026
        $earnedPolicy->update(['max_carry_forward_days' => 5.0]);

        // Rollover 2026 -> 2027 runs
        $leavePolicyService->rolloverYearBalances(2026, 2027);

        $balance2027 = EmployeeLeaveBalance::where('employee_id', $this->employee->id)
            ->where('client_leave_policy_id', $earnedPolicy->id)
            ->where('year', 2027)
            ->first();

        // Must be 10.0 (protected by 2026 snapshot_max_carry_forward_days = 15.0), NOT capped to 5.0!
        $this->assertEquals(10.0, (float)$balance2027->carried_over_days);
    }

    /** 7. Locked period guard blocks leave approval with 422 error */
    public function test_locked_period_blocks_leave_approval_with_422(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);
        $leavePolicyService->seedDefaultPolicies($this->client);

        // Create a LOCKED payroll run for July 2026
        PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'processed_by' => $this->adminUser->id,
        ]);

        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'sick',
            'from_date' => '2026-07-10',
            'to_date' => '2026-07-12',
            'days_count' => 3.0,
            'reason' => 'Retroactive sick leave',
            'status' => 'pending',
        ]);

        $this->expectException(ValidationException::class);
        $leavePolicyService->processApprovedLeave($leaveRequest);
    }

    /** 8. Working days calculation excludes holidays and weekly offs via AttendanceResolutionService delegation */
    public function test_leave_days_count_delegates_to_attendance_resolution_service(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);

        // Friday 2026-08-07 to Monday 2026-08-10 (4 calendar days)
        // Sat 2026-08-08 & Sun 2026-08-09 are weekly-offs
        // Add a client holiday on Monday 2026-08-10
        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => '2026-08-10',
            'name' => 'Special Holiday',
        ]);

        $workingDays = $leavePolicyService->calculateWorkingDaysForSpan($this->employee, '2026-08-07', '2026-08-10');

        // Out of 4 calendar days (Fri, Sat, Sun, Mon):
        // Sat, Sun are weekly-offs; Mon is a holiday. Only Friday is a working day!
        $this->assertEquals(1.0, $workingDays);
    }

    /** 9. LR-9 Scenario: Approving 7-day request with 5 days balance caps paid days at 5, marks 2 LOP, and leaves remaining_days at 0 (NOT negative) */
    public function test_partial_leave_approval_splits_paid_and_lop_without_negative_balance(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);

        // Setup Sick Leave policy with 5 days quota
        $policy = ClientLeavePolicy::updateOrCreate(
            ['client_id' => $this->client->id, 'leave_type' => 'sick'],
            [
                'policy_name' => 'Sick Leave',
                'annual_quota' => 5.0,
                'accrual_frequency' => 'annual_upfront',
                'carry_forward_allowed' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ]
        );

        // Employee balance: 5 days allocated, 0 used, 5 remaining
        $balance = EmployeeLeaveBalance::updateOrCreate(
            ['employee_id' => $this->employee->id, 'client_leave_policy_id' => $policy->id, 'year' => 2026],
            [
                'allocated_days' => 5.0,
                'used_days' => 0.0,
                'carried_over_days' => 0.0,
                'pending_days' => 0.0,
                'remaining_days' => 5.0,
                'snapshot_max_carry_forward_days' => 0.0,
            ]
        );

        // Request 7 working days (Wed Aug 12 to Thu Aug 20, 2026 - 7 working days)
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'sick',
            'from_date' => '2026-08-12',
            'to_date' => '2026-08-20',
            'days_count' => 7.0,
            'reason' => 'LR-9 Scenario Test',
            'status' => 'pending',
        ]);

        $leavePolicyService->processApprovedLeave($leaveRequest);

        $freshBalance = EmployeeLeaveBalance::find($balance->id);

        // Assert 1: remaining_days = 0.0 (NOT negative!)
        $this->assertEquals(0.0, (float)$freshBalance->remaining_days);

        // Assert 2: used_days = 5.0
        $this->assertEquals(5.0, (float)$freshBalance->used_days);

        // Assert 3: Exactly 5 attendance_records show status='on_leave'
        $onLeaveCount = \App\Models\AttendanceRecord::where('employee_id', $this->employee->id)
            ->whereBetween('attendance_date', ['2026-08-12', '2026-08-20'])
            ->where('status', 'on_leave')
            ->count();
        $this->assertEquals(5, $onLeaveCount);

        // Assert 4: Exactly 2 attendance_records show status='absent' (LOP)
        $absentCount = \App\Models\AttendanceRecord::where('employee_id', $this->employee->id)
            ->whereBetween('attendance_date', ['2026-08-12', '2026-08-20'])
            ->where('status', 'absent')
            ->count();
        $this->assertEquals(2, $absentCount);
    }

    /** 10. Max Days Per Month Cap: Annual Quota = 12d, Max Per Month = 1d. Employee takes 2 days in August -> 1st day paid, 2nd day LOP, remaining annual balance = 11d */
    public function test_monthly_usage_cap_enforces_lop_when_exceeded(): void
    {
        $leavePolicyService = app(LeavePolicyService::class);

        // Setup Casual Leave policy with 12 days annual quota, max 1 paid day per month
        $policy = ClientLeavePolicy::updateOrCreate(
            ['client_id' => $this->client->id, 'leave_type' => 'casual'],
            [
                'policy_name' => 'Casual Leave',
                'annual_quota' => 12.0,
                'accrual_frequency' => 'monthly',
                'monthly_accrual_rate' => 1.0,
                'max_days_per_month' => 1.0, // Max 1 paid day per month cap!
                'carry_forward_allowed' => false,
                'max_carry_forward_days' => 0,
                'is_active' => true,
            ]
        );

        // Balance: 12 days allocated, 0 used, 12 remaining
        $balance = EmployeeLeaveBalance::updateOrCreate(
            ['employee_id' => $this->employee->id, 'client_leave_policy_id' => $policy->id, 'year' => 2026],
            [
                'allocated_days' => 12.0,
                'used_days' => 0.0,
                'carried_over_days' => 0.0,
                'pending_days' => 0.0,
                'remaining_days' => 12.0,
                'snapshot_max_carry_forward_days' => 0.0,
            ]
        );

        // Request 2 working days in August (Wed Aug 12 to Thu Aug 13)
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'casual',
            'from_date' => '2026-08-12',
            'to_date' => '2026-08-13',
            'days_count' => 2.0,
            'reason' => 'Monthly Cap Test',
            'status' => 'pending',
        ]);

        $leavePolicyService->processApprovedLeave($leaveRequest);

        $freshBalance = EmployeeLeaveBalance::find($balance->id);

        // Assert 1: Only 1 paid day used (used_days = 1.0, remaining_days = 11.0)
        $this->assertEquals(1.0, (float)$freshBalance->used_days);
        $this->assertEquals(11.0, (float)$freshBalance->remaining_days);

        // Assert 2: Day 1 (Aug 12) is 'on_leave', Day 2 (Aug 13) is 'absent' (LOP)
        $day1 = \App\Models\AttendanceRecord::where('employee_id', $this->employee->id)->where('attendance_date', '2026-08-12')->first();
        $day2 = \App\Models\AttendanceRecord::where('employee_id', $this->employee->id)->where('attendance_date', '2026-08-13')->first();

        $this->assertEquals('on_leave', $day1->status);
        $this->assertEquals('absent', $day2->status);
    }
}
