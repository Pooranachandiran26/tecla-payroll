<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EmployeeDashboardDayBannerTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client;
    protected Employee $employee;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create([
            'weekly_off_pattern' => 'sat,sun',
        ]);
        ClientBranch::factory()->create(['client_id' => $this->client->id]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'date_of_joining' => '2024-01-01',
            'weekly_off_pattern' => null, // inherits client sat,sun
        ]);

        $this->user = User::create([
            'name' => 'Test Employee User',
            'email' => 'empbanner@example.com',
            'password' => bcrypt('password'),
            'role' => 'employee',
            'employee_id' => $this->employee->id,
        ]);
    }

    /**
     * Helper to retrieve dayBanner prop from dashboard response.
     */
    private function getDashboardBanner()
    {
        $response = $this->actingAs($this->user)->get('/employee/dashboard');
        $response->assertStatus(200);
        $page = $response->viewData('page');
        return $page['props']['todayDayBanner'] ?? $page['props']['dayBanner'] ?? null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Client holiday today, no override
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_client_holiday_today_shows_holiday_banner_and_punch_in_works()
    {
        $todayStr = Carbon::today()->toDateString();

        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => $todayStr,
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        $banner = $this->getDashboardBanner();

        $this->assertNotNull($banner);
        $this->assertEquals('warning', $banner['type']);
        $this->assertEquals("🌴 Today is a company holiday (Independence Day). You can still punch in if you're working today.", $banner['message']);

        // Test punch in works regardless
        $punchResponse = $this->actingAs($this->user)->post('/employee/attendance/punch-in', [
            'latitude' => 12.9716,
            'longitude' => 77.5946,
            'place_name' => 'Office HQ',
        ]);
        $punchResponse->assertRedirect();

        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $this->employee->id,
            'attendance_date' => $todayStr,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: Employee's normal weekly off today, no override
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_weekly_off_today_shows_weekly_off_banner_and_punch_in_works()
    {
        $today = Carbon::today();
        $todayAbbr = strtolower($today->format('D'));
        $todayStr = $today->toDateString();

        // Set employee weekly off pattern to include today
        $this->employee->update([
            'weekly_off_pattern' => "{$todayAbbr},sun",
        ]);

        $banner = $this->getDashboardBanner();

        $this->assertNotNull($banner);
        $this->assertEquals('info', $banner['type']);
        $this->assertEquals("🛌 Today is your usual day off. You can still punch in if you're working today.", $banner['message']);

        // Test punch in works
        $punchResponse = $this->actingAs($this->user)->post('/employee/attendance/punch-in', [
            'latitude' => 12.9716,
            'longitude' => 77.5946,
            'place_name' => 'Home Office',
        ]);
        $punchResponse->assertRedirect();

        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $this->employee->id,
            'attendance_date' => $todayStr,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: Approved override making today a work_day (swapped holiday)
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_approved_override_work_day_shows_swapped_work_day_banner()
    {
        $todayStr = Carbon::today()->toDateString();

        // Today is naturally a holiday
        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => $todayStr,
            'name' => 'Diwali',
        ]);

        // Approved day swap override making today a work_day
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $todayStr,
            'attendance_day_type' => 'work_day',
            'reason' => 'Day swap',
            'status' => 'approved',
            'approved_at' => now(),
            'swap_target_date' => '2026-11-15',
        ]);

        $banner = $this->getDashboardBanner();

        $this->assertNotNull($banner);
        $this->assertEquals('info', $banner['type']);
        $this->assertEquals("📋 You're scheduled to work today as part of an approved day swap (normally holiday).", $banner['message']);

        // Test punch in works
        $punchResponse = $this->actingAs($this->user)->post('/employee/attendance/punch-in');
        $punchResponse->assertRedirect();

        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $this->employee->id,
            'attendance_date' => $todayStr,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: Approved override making today a day off (swapped-in off day)
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_approved_override_day_off_shows_swapped_day_off_banner()
    {
        $todayStr = Carbon::today()->toDateString();
        $targetDateStr = '2026-08-15';

        // Approved day swap override making today a weekly_off
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => $todayStr,
            'attendance_day_type' => 'weekly_off',
            'reason' => 'Day swap taken off',
            'status' => 'approved',
            'approved_at' => now(),
            'swap_target_date' => $targetDateStr,
        ]);

        $banner = $this->getDashboardBanner();

        $this->assertNotNull($banner);
        $this->assertEquals('success', $banner['type']);
        $this->assertEquals("✅ You're on an approved day off today (swapped from {$targetDateStr}). Punching in is optional but will be recorded if you do.", $banner['message']);

        // Test punch in works
        $punchResponse = $this->actingAs($this->user)->post('/employee/attendance/punch-in');
        $punchResponse->assertRedirect();

        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $this->employee->id,
            'attendance_date' => $todayStr,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: Completely normal work day — no banner
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_normal_work_day_shows_no_banner()
    {
        $today = Carbon::today();
        $todayAbbr = strtolower($today->format('D'));
        $todayStr = $today->toDateString();

        // Ensure today is NOT in weekly_off_pattern (set pattern to days that don't include today)
        $offDays = array_diff(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], [$todayAbbr]);
        $this->employee->update([
            'weekly_off_pattern' => implode(',', array_slice(array_values($offDays), 0, 2)),
        ]);

        $banner = $this->getDashboardBanner();

        $this->assertNull($banner);

        // Test punch in works
        $punchResponse = $this->actingAs($this->user)->post('/employee/attendance/punch-in');
        $punchResponse->assertRedirect();

        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $this->employee->id,
            'attendance_date' => $todayStr,
        ]);
    }
}
