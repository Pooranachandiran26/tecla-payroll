<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\User;
use App\Services\AttendanceUploadValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AttendanceUploadHolidaySlotTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected AttendanceUploadValidationService $uploadService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->uploadService = app(AttendanceUploadValidationService::class);
    }

    private function createClientWithBranch(array $attributes = []): Client
    {
        $client = Client::factory()->create($attributes);
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    private function createTestCsv(array $rows): string
    {
        $path = storage_path('app/temp_test_upload_' . uniqid() . '.csv');
        $content = "employee_code,days_present,days_lop\n";
        foreach ($rows as $r) {
            $content .= "{$r['code']},{$r['present']},{$r['lop']}\n";
        }
        file_put_contents($path, $content);
        return $path;
    }

    #[Test]
    public function test_1_31_day_month_sun_pattern_1_holiday_computes_25_slots()
    {
        // August 2026 (31 days)
        // Client with 'sun' pattern (5 Sundays: Aug 2, 9, 16, 23, 30)
        // 1 Holiday on a work day: Aug 15 (Saturday, which is a work day under 'sun' pattern)
        $client = $this->createClientWithBranch([
            'company_name' => 'LOP_TESTING_AUG',
            'weekly_off_pattern' => 'sun',
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'EMP-AUG-01',
            'date_of_joining' => '2026-01-01',
        ]);

        // Expected working slots: 31 - 5 Sundays - 1 Holiday = 25 slots
        // Upload 23 Present / 2 LOP = 25 total
        $csvPath = $this->createTestCsv([
            ['code' => 'EMP-AUG-01', 'present' => 23, 'lop' => 2]
        ]);

        $result = $this->uploadService->validateFile($csvPath, $client->id, '2026-08');
        @unlink($csvPath);

        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);
        $this->assertEquals('valid', $result['rows'][0]['status']);
    }

    #[Test]
    public function test_2_30_day_month_sat_sun_pattern_1_holiday_computes_21_slots()
    {
        // June 2026 (30 days)
        // Client with 'sat,sun' pattern (8 weekend days)
        // 1 Holiday on a weekday: June 15 (Monday)
        $client = $this->createClientWithBranch([
            'weekly_off_pattern' => 'sat,sun',
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-06-15',
            'name' => 'Mid-Year Holiday',
            'is_optional' => false,
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'EMP-JUN-01',
            'date_of_joining' => '2026-01-01',
        ]);

        // Expected working slots: 30 - 8 weekend days - 1 Holiday = 21 slots
        // Upload 20 Present / 1 LOP = 21 total
        $csvPath = $this->createTestCsv([
            ['code' => 'EMP-JUN-01', 'present' => 20, 'lop' => 1]
        ]);

        $result = $this->uploadService->validateFile($csvPath, $client->id, '2026-06');
        @unlink($csvPath);

        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);
        $this->assertEquals('valid', $result['rows'][0]['status']);
    }

    #[Test]
    public function test_3_28_day_february_month_sat_sun_pattern_0_holidays_computes_20_slots()
    {
        // February 2026 (28 days)
        // Client with 'sat,sun' pattern (8 weekend days: Feb 1, 7, 8, 14, 15, 21, 22, 28)
        // 0 Holidays
        $client = $this->createClientWithBranch([
            'weekly_off_pattern' => 'sat,sun',
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'EMP-FEB-01',
            'date_of_joining' => '2026-01-01',
        ]);

        // Expected working slots: 28 - 8 weekend days = 20 slots
        // Upload 18 Present / 2 LOP = 20 total
        $csvPath = $this->createTestCsv([
            ['code' => 'EMP-FEB-01', 'present' => 18, 'lop' => 2]
        ]);

        $result = $this->uploadService->validateFile($csvPath, $client->id, '2026-02');
        @unlink($csvPath);

        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);
        $this->assertEquals('valid', $result['rows'][0]['status']);
    }

    #[Test]
    public function test_4_fri_sat_pattern_with_2_holidays_computes_correct_slots()
    {
        // October 2026 (31 days)
        // Client with 'fri,sat' pattern (10 Friday/Saturday off-days: Oct 2,3,9,10,16,17,23,24,30,31)
        // 2 Holidays on work days: Oct 5 (Monday) and Oct 6 (Tuesday)
        $client = $this->createClientWithBranch([
            'weekly_off_pattern' => 'fri,sat',
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-10-05',
            'name' => 'Autumn Fest Day 1',
            'is_optional' => false,
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-10-06',
            'name' => 'Autumn Fest Day 2',
            'is_optional' => false,
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'EMP-OCT-01',
            'date_of_joining' => '2026-01-01',
        ]);

        // Expected working slots: 31 - 10 off-days - 2 Holidays = 19 slots
        // Upload 18 Present / 1 LOP = 19 total
        $csvPath = $this->createTestCsv([
            ['code' => 'EMP-OCT-01', 'present' => 18, 'lop' => 1]
        ]);

        $result = $this->uploadService->validateFile($csvPath, $client->id, '2026-10');
        @unlink($csvPath);

        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);
        $this->assertEquals('valid', $result['rows'][0]['status']);
    }

    #[Test]
    public function test_5_holiday_falling_on_weekly_off_day_does_not_double_subtract()
    {
        // August 2026 (31 days)
        // Client with 'sun' pattern (5 Sundays: Aug 2, 9, 16, 23, 30)
        // Holiday created ON a Sunday: Aug 2, 2026 (Sunday)
        $client = $this->createClientWithBranch([
            'weekly_off_pattern' => 'sun',
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-02', // Sunday!
            'name' => 'Sunday Holiday',
            'is_optional' => false,
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'EMP-SUN-HOL-01',
            'date_of_joining' => '2026-01-01',
        ]);

        // Expected working slots: 31 days - 5 unique excluded dates = 26 slots (NOT 25)
        // Upload 24 Present / 2 LOP = 26 total
        $csvPath = $this->createTestCsv([
            ['code' => 'EMP-SUN-HOL-01', 'present' => 24, 'lop' => 2]
        ]);

        $result = $this->uploadService->validateFile($csvPath, $client->id, '2026-08');
        @unlink($csvPath);

        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);
        $this->assertEquals('valid', $result['rows'][0]['status']);
    }
}
