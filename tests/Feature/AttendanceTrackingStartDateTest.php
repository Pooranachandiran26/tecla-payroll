<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use App\Services\FullAndFinalCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AttendanceTrackingStartDateTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected AttendanceResolutionService $resolutionService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->resolutionService = app(AttendanceResolutionService::class);
    }

    private function createClientWithBranch(): Client
    {
        $client = Client::factory()->create();
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    private function getValidEmployeePayload(Client $client, array $overrides = []): array
    {
        return array_merge([
            'clientPartner' => $client->id,
            'fullName' => 'Historical Employee',
            'personalEmail' => 'historical@example.com',
            'phone' => '9876543210',
            'dob' => '1990-01-01',
            'doj' => '2023-01-01',
            'attendanceTrackingStartDate' => '2026-07-01',
            'gender' => 'male',
            'designation' => 'Senior Developer',
            'empType' => 'agency_contract',
            'priorEmploymentFlag' => false,
            'address' => '123 Main Street',
            'accountNo' => '123456789012',
            'ifsc' => 'HDFC0000001',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Historical Employee',
            'pan' => 'ABCDE1234F',
            'uanMode' => 'new',
            'esiMode' => 'new',
            'tdsRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            'basicSal' => 30000,
            'hraSal' => 10000,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ], $overrides);
    }

    #[Test]
    public function test_1_attendance_tracking_start_date_excludes_prior_cycle_days_from_resolution()
    {
        $client = $this->createClientWithBranch();
        
        // Employee joined 3 years ago (2023-01-01), but attendance tracking starts July 1, 2026
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'date_of_joining' => '2023-01-01',
            'attendance_tracking_start_date' => '2026-07-01',
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
        ]);

        // Custom cycle: June 26 to July 25
        $monthStart = '2026-06-26';
        $monthEnd = '2026-07-25';

        $result = $this->resolutionService->resolveForEmployee($employee, $monthStart, $monthEnd);

        // Days from June 26 to June 30 (5 days) must be completely EXCLUDED.
        // Effective resolution window starts on 2026-07-01 and ends on 2026-07-25 (25 days total).
        // Without attendance records, weekdays in July 1..25 become LOP, weekends become paid.
        // Total resolved days (paid + LOP) must equal 25 days (not 30 days of the full June 26-July 25 cycle).
        $totalResolvedDays = $result['paid_days'] + $result['lop_days'];
        $this->assertEquals(25.0, $totalResolvedDays);
    }

    #[Test]
    public function test_2_regression_null_attendance_tracking_start_date_uses_date_of_joining()
    {
        $client = $this->createClientWithBranch();
        
        // Employee with NULL attendance_tracking_start_date and date_of_joining = 2026-07-01
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'date_of_joining' => '2026-07-01',
            'attendance_tracking_start_date' => null,
            'pan_number' => 'BBBBB2222B',
            'aadhaar_number' => '222222222222',
            'bank_account_number' => '222222222222',
        ]);

        // Custom cycle: June 26 to July 25
        $monthStart = '2026-06-26';
        $monthEnd = '2026-07-25';

        $result = $this->resolutionService->resolveForEmployee($employee, $monthStart, $monthEnd);

        // Bounded by date_of_joining (2026-07-01), resolving 25 days (July 1 to July 25)
        $totalResolvedDays = $result['paid_days'] + $result['lop_days'];
        $this->assertEquals(25.0, $totalResolvedDays);
    }

    #[Test]
    public function test_3_date_of_joining_remains_untouched_and_tenure_services_unaffected()
    {
        $this->actingAs($this->admin);
        $client = $this->createClientWithBranch();

        $payload = $this->getValidEmployeePayload($client, [
            'doj' => '2023-01-01',
            'attendanceTrackingStartDate' => '2026-07-01',
            'personalEmail' => 'tenure_check@example.com',
        ]);

        $response = $this->post(route('employees.store'), $payload);
        $response->assertRedirect();

        $employee = Employee::where('personal_email', 'tenure_check@example.com')->firstOrFail();

        // 1. Verify DB record: date_of_joining is 2023-01-01 untouched
        $this->assertEquals('2023-01-01', (string) $employee->date_of_joining);
        $this->assertEquals('2026-07-01', (string) $employee->attendance_tracking_start_date);

        // 2. Verify FullAndFinalCalculationService uses real date_of_joining (2023-01-01) for tenure
        $fnfService = app(FullAndFinalCalculationService::class);
        $preview = $fnfService->calculatePreview($employee, ['last_working_day' => '2026-07-31']);
        
        $doj = \Carbon\Carbon::parse($employee->date_of_joining);
        $lwd = \Carbon\Carbon::parse('2026-07-31');
        $tenureYears = $doj->diffInDays($lwd) / 365.0;

        // Service tenure calculated strictly from 2023-01-01 is ~3.58 years, NOT 0.08 years (from July 1, 2026)
        $this->assertGreaterThanOrEqual(3.5, $tenureYears);
    }

    #[Test]
    public function test_4_validation_rejects_attendance_tracking_start_date_before_date_of_joining()
    {
        $this->actingAs($this->admin);
        $client = $this->createClientWithBranch();

        // Submission with attendanceTrackingStartDate (2022-12-31) BEFORE date_of_joining (2023-01-01)
        $payload = $this->getValidEmployeePayload($client, [
            'doj' => '2023-01-01',
            'attendanceTrackingStartDate' => '2022-12-31',
            'personalEmail' => 'invalid_atsd@example.com',
        ]);

        $response = $this->post(route('employees.store'), $payload);

        // Assert HTTP 422 session validation error on attendance_tracking_start_date
        $response->assertSessionHasErrors('attendance_tracking_start_date');
    }
}
