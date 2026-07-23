<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class WeeklyOffPatternSchemaTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function createClientWithBranch(array $attributes = []): Client
    {
        $client = Client::factory()->create($attributes);
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    #[Test]
    public function test_1_client_weekly_off_pattern_defaults_to_sat_sun()
    {
        $client = $this->createClientWithBranch();
        
        // Assert client defaults to 'sat,sun'
        $this->assertEquals('sat,sun', $client->weekly_off_pattern);
    }

    #[Test]
    public function test_2_valid_weekly_off_patterns_accepted_and_invalid_rejected()
    {
        $this->actingAs($this->admin);
        $client = $this->createClientWithBranch();

        // Valid patterns: sat,sun | sun | thu,fri | mon,tue,wed
        $validPatterns = ['sat,sun', 'sun', 'thu,fri', 'mon,tue,wed'];

        foreach ($validPatterns as $idx => $pattern) {
            $clientData = [
                'name' => "Valid Pattern Corp {$idx}",
                'code' => "VP{$idx}",
                'type' => 'pvt_ltd',
                'industry' => 'IT Services',
                'contractType' => 'agency',
                'billingModel' => 'markup',
                'markupPct' => 10,
                'contractStart' => '2026-01-01',
                'locationsCount' => 1,
                'regAddressLine1' => '123 Main St',
                'regCity' => 'Mumbai',
                'regState' => 'Maharashtra',
                'regPin' => '400001',
                'weeklyOffPattern' => $pattern,
                'poc1' => [
                    'name' => 'John POC',
                    'email' => "poc_{$idx}@div.com",
                    'phone' => '9876543210',
                ]
            ];

            $response = $this->post(route('clients.store'), $clientData);
            $response->assertRedirect();

            $createdClient = Client::where('client_code', "VP{$idx}")->firstOrFail();
            $this->assertEquals($pattern, $createdClient->weekly_off_pattern);
        }

        // Invalid patterns: saturday | sat,sat (duplicate) | xyz | 123
        $invalidPatterns = ['saturday', 'xyz', 'sat,sun,invalid', '123'];

        foreach ($invalidPatterns as $invalid) {
            $clientData = [
                'name' => 'Invalid Pattern Corp',
                'code' => 'INV' . rand(100, 999),
                'type' => 'pvt_ltd',
                'industry' => 'IT Services',
                'contractType' => 'agency',
                'billingModel' => 'markup',
                'markupPct' => 10,
                'contractStart' => '2026-01-01',
                'locationsCount' => 1,
                'regAddressLine1' => '123 Main St',
                'regCity' => 'Mumbai',
                'regState' => 'Maharashtra',
                'regPin' => '400001',
                'weeklyOffPattern' => $invalid,
                'poc1' => [
                    'name' => 'John POC',
                    'email' => 'poc_inv@div.com',
                    'phone' => '9876543210',
                ]
            ];

            $response = $this->post(route('clients.store'), $clientData);
            $response->assertSessionHasErrors('weekly_off_pattern');
        }
    }

    #[Test]
    public function test_3_holiday_and_attendance_override_models_and_relationships()
    {
        $client = $this->createClientWithBranch();
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
        ]);

        // Create Holiday record
        $holiday = Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        $this->assertDatabaseHas('holidays', [
            'client_id' => $client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
        ]);

        $this->assertCount(1, $client->holidays);
        $this->assertEquals('Independence Day', $client->holidays->first()->name);

        // Create paired Attendance Override records for Day Swap (Sat July 25 worked for Tue July 28 off)
        $override1 = EmployeeAttendanceOverride::create([
            'employee_id' => $employee->id,
            'override_date' => '2026-07-25',
            'attendance_day_type' => 'work_day',
            'reason' => 'Working Saturday in exchange for Tuesday off',
            'status' => 'approved',
            'swap_target_date' => '2026-07-28',
            'approved_at' => now(),
        ]);

        $override2 = EmployeeAttendanceOverride::create([
            'employee_id' => $employee->id,
            'override_date' => '2026-07-28',
            'attendance_day_type' => 'weekly_off',
            'reason' => 'Tuesday off in exchange for working Saturday',
            'status' => 'approved',
            'swap_target_date' => '2026-07-25',
            'approved_at' => now(),
        ]);

        $this->assertCount(2, $employee->attendanceOverrides);
        $override1Found = $employee->attendanceOverrides->first(fn($o) => \Carbon\Carbon::parse($o->override_date)->toDateString() === '2026-07-25');
        $override2Found = $employee->attendanceOverrides->first(fn($o) => \Carbon\Carbon::parse($o->override_date)->toDateString() === '2026-07-28');

        $this->assertNotNull($override1Found);
        $this->assertNotNull($override2Found);
        $this->assertEquals('work_day', $override1Found->attendance_day_type);
        $this->assertEquals('weekly_off', $override2Found->attendance_day_type);
    }
}
