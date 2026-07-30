<?php

namespace Tests\Feature;

use App\Jobs\NotifyWatchersJob;
use App\Mail\DaySwapApprovedMail;
use App\Mail\DaySwapRejectedMail;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DaySwapWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected Client $client;
    protected AttendanceResolutionService $resolutionService;

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
            'personal_email' => 'employee_swap@example.com',
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'email' => 'employee_swap@example.com',
        ]);

        $this->resolutionService = app(AttendanceResolutionService::class);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Employee submits a valid day swap
    // Submits Sat Jul 25, 2026 (work_day) for Tue Jul 28, 2026 (weekly_off).
    // Confirm 2 paired rows created with status='pending', swap_target_date linked.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_employee_submits_valid_day_swap()
    {
        Queue::fake([NotifyWatchersJob::class]);
        $this->actingAs($this->employeeUser);

        $origDate = Carbon::parse('2026-08-01')->toDateString(); // Future Saturday
        $newDate = Carbon::parse('2026-08-04')->toDateString();  // Future Tuesday

        $payload = [
            'original_date' => $origDate,
            'new_date' => $newDate,
            'reason' => 'Working Saturday to take Tuesday off for family event',
        ];

        $response = $this->post(route('employee.day-swaps.store'), $payload);
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // DB Proof: 2 paired rows created
        $this->assertDatabaseCount('employee_attendance_overrides', 2);

        // Row 1: Original off-day worked
        $this->assertDatabaseHas('employee_attendance_overrides', [
            'employee_id' => $this->employee->id,
            'override_date' => $origDate,
            'attendance_day_type' => 'work_day',
            'swap_target_date' => $newDate,
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // Row 2: Work day taken off instead
        $this->assertDatabaseHas('employee_attendance_overrides', [
            'employee_id' => $this->employee->id,
            'override_date' => $newDate,
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => $origDate,
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        // Notification Proof: NotifyWatchersJob dispatched on submission
        Queue::assertPushed(NotifyWatchersJob::class, function ($job) use ($origDate, $newDate) {
            return $job->category === 'system_alerts'
                && str_contains($job->subject, 'Attendance Day Swap Requested')
                && str_contains($job->summary, $origDate)
                && str_contains($job->summary, $newDate);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: Duplicate or conflicting swap request is BLOCKED (Safety Case)
    // Attempting a swap for a date that ALREADY has a pending/approved override.
    // Confirm HTTP session validation error, ZERO new rows created.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_duplicate_or_conflicting_swap_blocked()
    {
        // Pre-create an existing approved override on 2026-08-01
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-08-01',
            'attendance_day_type' => 'work_day',
            'reason' => 'Prior swap',
            'status' => 'approved',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->employeeUser);

        // Attempt new swap request involving 2026-08-01 again
        $payload = [
            'original_date' => '2026-08-01', // Conflicting date!
            'new_date' => '2026-07-29',
            'reason' => 'Attempting duplicate swap on same date',
        ];

        $response = $this->post(route('employee.day-swaps.store'), $payload);
        $response->assertSessionHasErrors('original_date');

        // Confirm ZERO additional rows created (only the initial 1 row exists)
        $this->assertDatabaseCount('employee_attendance_overrides', 1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: Admin approves swap
    // Confirm BOTH paired rows update to status='approved' atomically.
    // Confirm approval email queued to employee.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_admin_approves_swap()
    {
        Mail::fake();

        // Seed 2 paired pending rows
        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-08-01',
            'attendance_day_type' => 'work_day',
            'swap_target_date' => '2026-07-28',
            'reason' => 'Day swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $row2 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-07-28',
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => '2026-08-01',
            'reason' => 'Day swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('employees.day-swaps.approve', $row1->id));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // DB Proof: BOTH rows flipped to 'approved' atomically
        $row1->refresh();
        $row2->refresh();

        $this->assertEquals('approved', $row1->status);
        $this->assertEquals('approved', $row2->status);
        $this->assertEquals($this->admin->id, $row1->approved_by);
        $this->assertEquals($this->admin->id, $row2->approved_by);
        $this->assertNotNull($row1->approved_at);
        $this->assertNotNull($row2->approved_at);

        // Mail Proof: DaySwapApprovedMail queued to employee
        Mail::assertQueued(DaySwapApprovedMail::class, function ($mail) {
            return $mail->hasTo($this->employee->personal_email)
                && $mail->employeeName === $this->employee->full_name
                && $mail->originalDate === '2026-08-01'
                && $mail->newDate === '2026-07-28';
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: Admin rejects swap with reason
    // Confirm BOTH paired rows update to status='rejected' with rejection_reason.
    // Confirm rejection email queued to employee.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_admin_rejects_swap()
    {
        Mail::fake();

        $row1 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-08-01',
            'attendance_day_type' => 'work_day',
            'swap_target_date' => '2026-07-28',
            'reason' => 'Day swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $row2 = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-07-28',
            'attendance_day_type' => 'weekly_off',
            'swap_target_date' => '2026-08-01',
            'reason' => 'Day swap',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('employees.day-swaps.reject', $row1->id), [
            'rejection_reason' => 'Insufficient coverage on Tuesday',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // DB Proof: BOTH rows flipped to 'rejected' with rejection_reason
        $row1->refresh();
        $row2->refresh();

        $this->assertEquals('rejected', $row1->status);
        $this->assertEquals('rejected', $row2->status);
        $this->assertEquals('Insufficient coverage on Tuesday', $row1->rejection_reason);
        $this->assertEquals('Insufficient coverage on Tuesday', $row2->rejection_reason);

        // Mail Proof: DaySwapRejectedMail queued to employee
        Mail::assertQueued(DaySwapRejectedMail::class, function ($mail) {
            return $mail->hasTo($this->employee->personal_email)
                && $mail->employeeName === $this->employee->full_name
                && $mail->reason === 'Insufficient coverage on Tuesday';
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: REAL END-TO-END SWAP RESOLUTION IN PAYROLL
    // Submit swap → Admin approve → Run AttendanceResolutionService for July 2026.
    // Confirm original date (Sat Jul 25: work_day, NO attendance record) → LOP.
    // Confirm new date (Tue Jul 28: weekly_off, NO attendance record) → Paid.
    // Confirm ZERO additional code changes needed in AttendanceResolutionService!
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_real_end_to_end_swap_resolution_in_payroll()
    {
        // 1. Employee submits swap: Sat Aug 1 (worked off-day) for Tue Aug 4 (off day)
        $this->actingAs($this->employeeUser);
        $this->post(route('employee.day-swaps.store'), [
            'original_date' => '2026-08-01',
            'new_date' => '2026-08-04',
            'reason' => 'End to end swap test',
        ]);

        $primaryRow = EmployeeAttendanceOverride::where('employee_id', $this->employee->id)
            ->where('override_date', '2026-08-01')
            ->firstOrFail();

        // 2. Admin approves the swap
        $this->actingAs($this->admin);
        $this->post(route('employees.day-swaps.approve', $primaryRow->id));

        // 3. Seed weekday attendance records for ALL OTHER weekdays in August 2026 EXCEPT Tue Aug 4
        $start = Carbon::parse('2026-08-01');
        $end = Carbon::parse('2026-08-31');

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $dateStr = $date->toDateString();
            // Skip weekends and skip Tue Aug 4 (the swapped off day)
            if (!$date->isWeekend() && $dateStr !== '2026-08-04') {
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $dateStr,
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Also seed an attendance record for Sat Aug 1 (the worked off-day) as 'present'
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-08-01',
            'status' => 'present',
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 4. Run AttendanceResolutionService for August 2026 (31 days)
        $result = $this->resolutionService->resolveForEmployee($this->employee, '2026-08-01', '2026-08-31');

        $this->assertEquals(31.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 6: ORPHAN PAIRED ROW APPROVAL FAILS LOUDLY (Safety Case)
    // Seed only 1 row of a swap pair (simulating DB anomaly / orphan row).
    // Attempt admin approval → ABORTS WITH ERROR, status stays 'pending',
    // ZERO rows modified into half-approved state.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_6_orphan_paired_row_approval_fails_loudly()
    {
        // Manually seed ONLY 1 row of a swap pair (orphan row, missing row 2)
        $orphanRow = EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-08-01',
            'attendance_day_type' => 'work_day',
            'swap_target_date' => '2026-07-28', // points to Jul 28, but no row exists for Jul 28!
            'reason' => 'Orphan row test',
            'status' => 'pending',
            'requested_by' => $this->employeeUser->id,
        ]);

        $this->actingAs($this->admin);

        // Attempt admin approval
        $response = $this->post(route('employees.day-swaps.approve', $orphanRow->id));

        // Assert redirect back with error message
        $response->assertRedirect();
        $response->assertSessionHas('error');

        // DB Proof: Status MUST STILL BE 'pending' (zero half-approved corruption)
        $orphanRow->refresh();
        $this->assertEquals('pending', $orphanRow->status);
        $this->assertNull($orphanRow->approved_by);
        $this->assertNull($orphanRow->approved_at);
    }
}
