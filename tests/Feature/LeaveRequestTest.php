<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\LeaveRequest;
use App\Models\AttendanceRecord;
use Carbon\Carbon;

class LeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->client = Client::factory()->create([
            'status' => 'active'
        ]);

        $this->branch = \App\Models\ClientBranch::factory()->create([
            'client_id' => $this->client->id
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'employee_code' => 'TEC-999',
            'employer_pf_monthly' => 1950.00
        ]);

        $this->employeeUser = User::create([
            'name' => 'John Doe',
            'email' => 'john.doe@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'status' => 'active',
            'must_change_password' => false
        ]);

        $this->adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false
        ]);
    }

    public function test_submit_leave_computes_days_correctly()
    {
        $response = $this->actingAs($this->employeeUser)->post('/employee/leave-requests', [
            'leave_type' => 'casual',
            'from_date' => '2026-07-01',
            'to_date' => '2026-07-03',
            'reason' => 'Going out of town for a few days.'
        ]);

        $response->assertSessionHas('success');
        
        $leave = LeaveRequest::first();
        $this->assertNotNull($leave);
        $this->assertEquals(3.0, $leave->days_count);
        $this->assertEquals('casual', $leave->leave_type);
        $this->assertEquals('pending', $leave->status);
    }

    public function test_overlapping_request_is_rejected()
    {
        LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'casual',
            'from_date' => '2026-07-01',
            'to_date' => '2026-07-03',
            'days_count' => 3,
            'reason' => 'First request.',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->employeeUser)->post('/employee/leave-requests', [
            'leave_type' => 'sick',
            'from_date' => '2026-07-02',
            'to_date' => '2026-07-04',
            'reason' => 'Overlapping sick leave.'
        ]);

        $response->assertSessionHas('error', 'You already have a pending or approved leave request for this date range.');
        $this->assertEquals(1, LeaveRequest::count());
    }

    public function test_approve_creates_and_updates_attendance_records_correctly()
    {
        // Setup: One date has NO record (2026-07-01)
        // One date has a LIVE PUNCH record (2026-07-02)
        // One date has an UPLOADED record (2026-07-03)
        
        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-07-02',
            'punch_in_time' => '2026-07-02 09:00:00',
            'punch_out_time' => '2026-07-02 12:00:00',
            'hours_worked' => 3,
            'status' => 'half_day',
            'source' => 'live_punch'
        ]);

        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-07-03',
            'punch_in_time' => '2026-07-03 09:00:00',
            'punch_out_time' => '2026-07-03 18:00:00',
            'hours_worked' => 9,
            'status' => 'present',
            'source' => 'uploaded'
        ]);

        $leave = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'sick',
            'from_date' => '2026-07-01',
            'to_date' => '2026-07-03',
            'days_count' => 3,
            'reason' => 'Sick for 3 days.',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->adminUser)->post("/leave-requests/{$leave->id}/approve");
        $response->assertSessionHas('success');

        $leave->refresh();
        $this->assertEquals('approved', $leave->status);
        $this->assertEquals($this->adminUser->id, $leave->approved_by);
        $this->assertNotNull($leave->decided_at);

        // Verify Attendance Records
        $record1 = AttendanceRecord::where('attendance_date', '2026-07-01')->first();
        $this->assertEquals('on_leave', $record1->status);
        $this->assertEquals('override', $record1->source);
        $this->assertNull($record1->punch_in_time);

        $record2 = AttendanceRecord::where('attendance_date', '2026-07-02')->first();
        $this->assertEquals('on_leave', $record2->status);
        $this->assertEquals('override', $record2->source);
        // Live punch MUST be preserved!
        $this->assertNotNull($record2->punch_in_time);
        $this->assertEquals(3, $record2->hours_worked);

        $record3 = AttendanceRecord::where('attendance_date', '2026-07-03')->first();
        $this->assertEquals('on_leave', $record3->status);
        $this->assertEquals('override', $record3->source);
        // Uploaded record should be fully overwritten (nulled)
        $this->assertNull($record3->punch_in_time);
        $this->assertNull($record3->hours_worked);
    }

    public function test_reject_leaves_attendance_records_untouched()
    {
        $leave = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'casual',
            'from_date' => '2026-07-01',
            'to_date' => '2026-07-01',
            'days_count' => 1,
            'reason' => 'Casual day.',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->adminUser)->post("/leave-requests/{$leave->id}/reject", [
            'rejection_reason' => 'Too busy right now.'
        ]);
        
        $response->assertSessionHas('success');

        $leave->refresh();
        $this->assertEquals('rejected', $leave->status);
        $this->assertEquals('Too busy right now.', $leave->rejection_reason);
        $this->assertEquals($this->adminUser->id, $leave->approved_by);
        $this->assertNotNull($leave->decided_at);

        $this->assertEquals(0, AttendanceRecord::where('attendance_date', '2026-07-01')->count());
    }

    public function test_employee_cannot_approve_leave()
    {
        $leave = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'casual',
            'from_date' => '2026-07-01',
            'to_date' => '2026-07-01',
            'days_count' => 1,
            'reason' => 'Casual day.',
            'status' => 'pending'
        ]);

        $response = $this->actingAs($this->employeeUser)->post("/leave-requests/{$leave->id}/approve");
        $response->assertStatus(403);
    }
}
