<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\AttendanceRecord;
use App\Services\PayrollEligibilityService;
use App\Services\AttendanceResolutionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class PayrollEligibilityDOJTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_with_future_date_of_joining_is_excluded()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'HQ',
            'gstin' => '27AABCT1234L1ZQ'
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'active',
            'date_of_joining' => '2026-08-01',
            'uan_mode' => 'new',
            'pan_number' => 'ABCDE1234Z',
            'aadhaar_number' => '123412341234',
            'bank_account_number' => 'BANK12345678',
        ]);

        // Mock AttendanceResolutionService to ensure it is never reached
        $mock = $this->mock(AttendanceResolutionService::class);
        $mock->shouldNotReceive('resolveForEmployee');

        $service = app(PayrollEligibilityService::class);
        $result = $service->checkEmployee($employee, $client, '2026-07-01', '2026-07-31');

        $this->assertFalse($result['is_eligible']);
        $this->assertContains(
            "Employee's date of joining (2026-08-01) is after this payroll period",
            $result['exclusions']
        );
    }

    public function test_punch_in_before_date_of_joining_is_rejected()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'HQ',
            'gstin' => '27AABCT1234L1ZQ'
        ]);

        // Date of joining is tomorrow
        $tomorrow = Carbon::tomorrow()->toDateString();
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'active',
            'date_of_joining' => $tomorrow,
            'uan_mode' => 'new',
            'pan_number' => 'ABCDE1234Z',
            'aadhaar_number' => '123412341234',
            'bank_account_number' => 'BANK12345678',
        ]);

        $user = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $employee->id,
        ]);

        // Force Carbon today for the request context (in case it runs at midnight boundary)
        Carbon::setTestNow(Carbon::today());

        $response = $this->actingAs($user)
            ->from('/employee/attendance')
            ->post('/employee/attendance/punch-in');

        $response->assertRedirect('/employee/attendance');
        $response->assertSessionHas('warning', "Cannot punch in before your date of joining ({$tomorrow}).");

        // Verify no attendance_records were created
        $this->assertEquals(0, AttendanceRecord::where('employee_id', $employee->id)->count());

        Carbon::setTestNow(); // Clean up test now
    }
}
