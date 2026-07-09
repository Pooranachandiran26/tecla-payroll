<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\AttendanceRecord;
use App\Models\LeaveRequest;
use Carbon\Carbon;

class EmployeeDashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_summary_matches_real_attendance_and_leave_counts()
    {
        $client = Client::factory()->create(['status' => 'active']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'pf_applicable' => true,
            'esi_applicable' => true
        ]);

        $user = User::create([
            'name' => 'Dashboard User',
            'email' => 'dash@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'employee_id' => $employee->id,
        ]);

        $today = Carbon::today();
        
        // Create 2 present days, 1 half_day, 3 on_leave days in this month
        AttendanceRecord::create(['employee_id' => $employee->id, 'attendance_date' => $today->copy()->startOfMonth()->toDateString(), 'status' => 'present', 'source' => 'live_punch']);
        AttendanceRecord::create(['employee_id' => $employee->id, 'attendance_date' => $today->copy()->startOfMonth()->addDay()->toDateString(), 'status' => 'present', 'source' => 'live_punch']);
        AttendanceRecord::create(['employee_id' => $employee->id, 'attendance_date' => $today->copy()->startOfMonth()->addDays(2)->toDateString(), 'status' => 'half_day', 'source' => 'live_punch']);
        AttendanceRecord::create(['employee_id' => $employee->id, 'attendance_date' => $today->copy()->startOfMonth()->addDays(3)->toDateString(), 'status' => 'on_leave', 'source' => 'override']);
        AttendanceRecord::create(['employee_id' => $employee->id, 'attendance_date' => $today->copy()->startOfMonth()->addDays(4)->toDateString(), 'status' => 'on_leave', 'source' => 'override']);
        AttendanceRecord::create(['employee_id' => $employee->id, 'attendance_date' => $today->copy()->startOfMonth()->addDays(5)->toDateString(), 'status' => 'on_leave', 'source' => 'override']);

        // Create 2 pending leave requests
        LeaveRequest::create(['employee_id' => $employee->id, 'leave_type' => 'casual', 'from_date' => '2026-10-01', 'to_date' => '2026-10-02', 'days_count' => 2, 'reason' => 'Test', 'status' => 'pending', 'created_at' => now()->subDay()]);
        LeaveRequest::create(['employee_id' => $employee->id, 'leave_type' => 'sick', 'from_date' => '2026-10-05', 'to_date' => '2026-10-06', 'days_count' => 2, 'reason' => 'Test 2', 'status' => 'pending', 'created_at' => now()]);

        // Fetch Dashboard Props
        $response = $this->actingAs($user)->get('/employee/dashboard');
        
        // Extract inertia props
        $page = $response->viewData('page');
        $props = $page['props'];

        $attendanceStats = $props['attendanceStats'];
        $leaveStats = $props['leaveStats'];
        $documentStats = $props['documentStats'];

        // Assert Attendance matches DB exactly
        $this->assertEquals(2, $attendanceStats['days_present']);
        $this->assertEquals(1, $attendanceStats['days_half_day']);
        $this->assertEquals(3, $attendanceStats['days_on_leave']);
        $this->assertEquals(0, $attendanceStats['days_absent']); // explicit 0

        // Assert Leave matches DB exactly
        $this->assertEquals(2, $leaveStats['pending_count']);
        $this->assertNotNull($leaveStats['recent_request']);
        $this->assertEquals('pending', $leaveStats['recent_request']['status']);

        // Assert Documents matches logic (8 required for PF/ESI true)
        $this->assertEquals(8, $documentStats['required']);
        $this->assertEquals(0, $documentStats['verified']);

        echo "\n--- REAL DASHBOARD PROPS ---\n";
        dump($attendanceStats);
        dump($leaveStats);
        dump($documentStats);

        $this->assertTrue(true);
    }
}
