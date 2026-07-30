<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DaySwapWithdrawalAndConflictNoteTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected User $otherEmployeeUser;
    protected Employee $otherEmployee;
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
            'personal_email' => 'withdraw_test@example.com',
            'pan_number' => 'CCCCC3333C',
            'aadhaar_number' => '333333333333',
            'bank_account_number' => '333333333333',
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'email' => 'withdraw_test@example.com',
        ]);

        $this->otherEmployee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'date_of_joining' => '2024-01-01',
            'weekly_off_pattern' => null,
            'personal_email' => 'other_test@example.com',
            'pan_number' => 'DDDDD4444D',
            'aadhaar_number' => '444444444444',
            'bank_account_number' => '444444444444',
        ]);

        $this->otherEmployeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->otherEmployee->id,
            'email' => 'other_test@example.com',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Submission is BLOCKED upfront if a real attendance record
    // already exists for either date.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_submission_blocked_if_real_attendance_record_exists()
    {
        $futureDate1 = Carbon::today()->addDays(10)->toDateString();
        $futureDate2 = Carbon::today()->addDays(12)->toDateString();

        // Create an attendance record for futureDate1
        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => $futureDate1,
            'status' => 'half_day',
            'source' => 'live_punch',
        ]);

        $this->actingAs($this->employeeUser);

        $response = $this->post(route('employee.day-swaps.store'), [
            'original_date' => $futureDate1,
            'new_date' => $futureDate2,
            'reason' => 'Testing submission block for date with attendance',
        ]);

        $response->assertSessionHasErrors('original_date');
        $errorMsg = session('errors')->get('original_date')[0];
        $this->assertStringContainsString($futureDate1, $errorMsg);
        $this->assertStringContainsString('attendance record', $errorMsg);
        $this->assertStringContainsString('half_day', $errorMsg);

        // Zero swap overrides created
        $this->assertDatabaseCount('employee_attendance_overrides', 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: Employee index returns a conflictNote when a pending swap's
    // date has a real attendance record.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_employee_index_returns_conflict_note_when_attendance_record_exists()
    {
        $futureDate1 = Carbon::today()->addDays(15)->toDateString();
        $futureDate2 = Carbon::today()->addDays(17)->toDateString();

        // Create pending swap pair
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Pending swap before punch',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Pending swap before punch',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // Real attendance record appears on futureDate1 AFTER submission
        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => $futureDate1,
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $this->actingAs($this->employeeUser);

        $response = $this->get(route('employee.day-swaps.index'));

        $response->assertStatus(200);
        $requests = $response->inertiaProps('requests');
        $this->assertNotEmpty($requests);

        $targetReq = collect($requests)->firstWhere('originalDate', $futureDate1);
        $this->assertNotNull($targetReq);
        $this->assertNotNull($targetReq['conflictNote']);
        $this->assertStringContainsString('Heads up — you punched in on', $targetReq['conflictNote']);
        $this->assertStringContainsString($futureDate1, $targetReq['conflictNote']);
        $this->assertTrue($targetReq['canWithdraw']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: Employee can withdraw a pending day swap -> status='withdrawn'
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_employee_can_withdraw_pending_day_swap_to_withdrawn_status()
    {
        $futureDate1 = Carbon::today()->addDays(20)->toDateString();
        $futureDate2 = Carbon::today()->addDays(22)->toDateString();

        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Swap to be withdrawn',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        $row2 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Swap to be withdrawn',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->employeeUser);

        $response = $this->post(route('employee.day-swaps.withdraw', $row1->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Confirm BOTH paired rows have status='withdrawn' (NOT deleted)
        $row1->refresh();
        $row2->refresh();

        $this->assertEquals('withdrawn', $row1->status);
        $this->assertEquals('withdrawn', $row2->status);
        $this->assertDatabaseCount('employee_attendance_overrides', 2);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: Withdrawn swap frees dates for a new swap request.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_withdrawn_swap_frees_date_for_new_swap()
    {
        $futureDate1 = Carbon::today()->addDays(25)->toDateString();
        $futureDate2 = Carbon::today()->addDays(27)->toDateString();
        $futureDate3 = Carbon::today()->addDays(29)->toDateString();

        // 1. Seed & withdraw initial swap
        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Initial swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Initial swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->employeeUser);
        $this->post(route('employee.day-swaps.withdraw', $row1->id));

        // 2. Submit NEW swap using futureDate1 again with futureDate3
        $response = $this->post(route('employee.day-swaps.store'), [
            'original_date' => $futureDate1,
            'new_date' => $futureDate3,
            'reason' => 'New swap after withdrawal',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Confirm 4 total rows in DB (2 withdrawn + 2 pending)
        $this->assertDatabaseCount('employee_attendance_overrides', 4);
        $this->assertDatabaseHas('employee_attendance_overrides', [
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'swap_target_date' => $futureDate3,
            'status' => 'pending',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: Employee CANNOT withdraw another employee's swap request.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_employee_cannot_withdraw_another_employees_swap()
    {
        $futureDate1 = Carbon::today()->addDays(30)->toDateString();
        $futureDate2 = Carbon::today()->addDays(32)->toDateString();

        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->otherEmployee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Other employee swap',
            'status' => 'pending',
            'requested_by' => $this->otherEmployeeUser->id,
        ]);

        $this->actingAs($this->employeeUser); // Act as primary employee

        $response = $this->post(route('employee.day-swaps.withdraw', $row1->id));

        $response->assertStatus(404);

        $row1->refresh();
        $this->assertEquals('pending', $row1->status);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 6: Employee CANNOT withdraw an approved or rejected swap.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_6_employee_cannot_withdraw_approved_or_rejected_swap()
    {
        $futureDate1 = Carbon::today()->addDays(35)->toDateString();
        $futureDate2 = Carbon::today()->addDays(37)->toDateString();

        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Approved swap',
            'status' => 'approved',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->employeeUser);

        $response = $this->post(route('employee.day-swaps.withdraw', $row1->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $row1->refresh();
        $this->assertEquals('approved', $row1->status);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 7: Admin approve Guard 4 returns softened guidance error message.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_7_admin_approve_guard_4_returns_softened_guidance_message()
    {
        $futureDate1 = Carbon::today()->addDays(40)->toDateString();
        $futureDate2 = Carbon::today()->addDays(42)->toDateString();

        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate1,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $futureDate2,
            'reason' => 'Swap for softened message test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $futureDate2,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $futureDate1,
            'reason' => 'Swap for softened message test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // Insert real attendance record AFTER submission
        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => $futureDate1,
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('employees.day-swaps.approve', $row1->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $errorMsg = session('error');

        $this->assertStringContainsString("This request can't be approved because the employee already has a recorded present for", $errorMsg);
        $this->assertStringContainsString("Consider rejecting this request so the employee can resubmit correctly.", $errorMsg);
    }
}
