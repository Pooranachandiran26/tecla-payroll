<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DaySwapValidationGuardsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->client = Client::factory()->create([
            'weekly_off_pattern' => 'sat,sun',
        ]);
        ClientBranch::factory()->create(['client_id' => $this->client->id]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'date_of_joining' => '2024-01-01',
            'weekly_off_pattern' => null,
            'personal_email' => 'guard_test@example.com',
            'pan_number' => 'BBBBB2222B',
            'aadhaar_number' => '222222222222',
            'bank_account_number' => '222222222222',
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'email' => 'guard_test@example.com',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: GUARD 1 — Past-date swap rejected at submission.
    // Attempting a swap where one date is yesterday → blocked with clear
    // message naming the past date.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_past_date_swap_rejected_at_submission()
    {
        $this->actingAs($this->employeeUser);

        $yesterday = Carbon::yesterday()->toDateString();
        $futureDate = Carbon::today()->addDays(10)->toDateString();

        $response = $this->post(route('employee.day-swaps.store'), [
            'original_date' => $yesterday,
            'new_date' => $futureDate,
            'reason' => 'Trying to swap a past date which should be blocked',
        ]);

        $response->assertSessionHasErrors('original_date');
        $this->assertStringContainsString($yesterday, session('errors')->get('original_date')[0]);
        $this->assertStringContainsString('past', session('errors')->get('original_date')[0]);

        // Zero rows created
        $this->assertDatabaseCount('employee_attendance_overrides', 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: GUARD 2 — No-op swap (same non-work_day classification)
    // rejected at submission. Both dates are holidays → blocked.
    //
    // NOTE: work_day-for-work_day is NOT blocked — that's a legitimate
    // schedule change (e.g., "work Monday instead of Wednesday"). Only
    // identical non-work_day types (holiday-for-holiday, weekly_off-for-
    // weekly_off) are no-ops. holiday-vs-weekly_off is also ALLOWED
    // (different reasons for being paid).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_noop_holiday_for_holiday_swap_rejected()
    {
        // Create 2 holidays on future dates for this client
        $holidayDate1 = Carbon::today()->addDays(20)->toDateString();
        $holidayDate2 = Carbon::today()->addDays(25)->toDateString();

        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => $holidayDate1,
            'name' => 'Test Holiday Alpha',
            'is_optional' => false,
        ]);
        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => $holidayDate2,
            'name' => 'Test Holiday Beta',
            'is_optional' => false,
        ]);

        $this->actingAs($this->employeeUser);

        $response = $this->post(route('employee.day-swaps.store'), [
            'original_date' => $holidayDate1,
            'new_date' => $holidayDate2,
            'reason' => 'Trying to swap holiday for holiday which should be a no-op',
        ]);

        $response->assertSessionHasErrors('original_date');
        $errorMsg = session('errors')->get('original_date')[0];
        $this->assertStringContainsString('no-op', $errorMsg);
        $this->assertStringContainsString('holidays', $errorMsg);

        // Zero rows created
        $this->assertDatabaseCount('employee_attendance_overrides', 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: GUARD 3 — Duplicate pending request for an already-pending
    // date rejected at submission. A pending swap already exists for
    // date X → attempting another swap involving date X is blocked.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_duplicate_pending_date_rejected()
    {
        // Pre-create a pending swap pair involving futureDate1
        $futureDate1 = Carbon::today()->addDays(15)->toDateString();
        $futureDate2 = Carbon::today()->addDays(16)->toDateString();
        $futureDate3 = Carbon::today()->addDays(17)->toDateString();

        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Existing pending swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Existing pending swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->employeeUser);

        // Attempt a NEW swap involving futureDate1 (already pending)
        $response = $this->post(route('employee.day-swaps.store'), [
            'original_date' => $futureDate1,
            'new_date' => $futureDate3,
            'reason' => 'Trying to swap date already in a pending request',
        ]);

        $response->assertSessionHasErrors('original_date');
        $errorMsg = session('errors')->get('original_date')[0];
        $this->assertStringContainsString('pending', $errorMsg);
        $this->assertStringContainsString($futureDate1, $errorMsg);

        // Only the 2 original rows exist — zero new rows
        $this->assertDatabaseCount('employee_attendance_overrides', 2);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: GUARD 4 — Approval blocked if real attendance record now
    // exists on either date (punched/uploaded between submission and
    // approval attempt).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_approval_blocked_if_attendance_exists()
    {
        $futureDate1 = Carbon::today()->addDays(30)->toDateString();
        $futureDate2 = Carbon::today()->addDays(32)->toDateString();

        // Create pending swap pair
        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Swap for attendance guard test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Swap for attendance guard test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // AFTER submission, a real attendance record appears on futureDate2
        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => $futureDate2,
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('employees.day-swaps.approve', $row1->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $errorMsg = session('error');
        $this->assertStringContainsString($futureDate2, $errorMsg);
        $this->assertStringContainsString('recorded', $errorMsg);
        $this->assertStringContainsString('Consider rejecting this request', $errorMsg);

        // Both rows must still be 'pending'
        $row1->refresh();
        $this->assertEquals('pending', $row1->status);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: GUARD 5 — Approval blocked if approved leave now exists
    // on either date (leave approved between submission and approval).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_approval_blocked_if_approved_leave_exists()
    {
        $futureDate1 = Carbon::today()->addDays(40)->toDateString();
        $futureDate2 = Carbon::today()->addDays(42)->toDateString();

        // Create pending swap pair
        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Swap for leave guard test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Swap for leave guard test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // AFTER submission, an approved leave covers futureDate1
        LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'casual',
            'from_date' => $futureDate1,
            'to_date' => $futureDate1,
            'days_count' => 1,
            'reason' => 'Personal leave',
            'status' => 'approved',
            'approved_by' => $this->admin->id,
            'decided_at' => now(),
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('employees.day-swaps.approve', $row1->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $errorMsg = session('error');
        $this->assertStringContainsString($futureDate1, $errorMsg);
        $this->assertStringContainsString('approved leave', $errorMsg);

        // Row stays pending
        $row1->refresh();
        $this->assertEquals('pending', $row1->status);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 6: GUARD 6 — Approval blocked if another approved override
    // now exists on either date (another swap approved between this
    // swap's submission and approval attempt).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_6_approval_blocked_if_another_approved_override_exists()
    {
        $futureDate1 = Carbon::today()->addDays(50)->toDateString();
        $futureDate2 = Carbon::today()->addDays(52)->toDateString();

        // Create pending swap pair
        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Swap for override guard test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Swap for override guard test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // AFTER submission, ANOTHER approved override lands on futureDate1
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'reason' => 'Separate approved override',
            'status' => 'approved',
            'requested_by' => $this->admin->id,
            'approved_by' => $this->admin->id,
            'approved_at' => now(),
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('employees.day-swaps.approve', $row1->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $errorMsg = session('error');
        $this->assertStringContainsString($futureDate1, $errorMsg);
        $this->assertStringContainsString('another approved', $errorMsg);

        // Row stays pending
        $row1->refresh();
        $this->assertEquals('pending', $row1->status);
    }
}
