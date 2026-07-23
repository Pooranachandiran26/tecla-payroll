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

class AttendanceUploadUiContextTest extends TestCase
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
    public function test_1_context_api_slot_matches_validation_service_exact_single_source_of_truth()
    {
        // Setup client: August 2026, 'sun' pattern (5 Sundays), 1 Holiday on Aug 15
        $client = $this->createClientWithBranch([
            'company_name' => 'LOP_TESTING_CONTEXT',
            'weekly_off_pattern' => 'sun',
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        // 1. Fetch from HTTP endpoint GET /payroll/attendance/context
        $response = $this->actingAs($this->admin)->getJson("/payroll/attendance/context?client_id={$client->id}&target_month=2026-08");
        $response->assertStatus(200);

        $json = $response->json();
        $this->assertEquals(25, $json['working_days_slots']);
        $this->assertEquals(31, $json['total_calendar_days']);
        $this->assertEquals(5, $json['off_days_count']);
        $this->assertEquals('Sunday', $json['off_days_label']);

        // 2. Call service directly to prove single source of truth
        $directContext = $this->uploadService->calculateWorkingDaysContext($client->id, '2026-08');
        $this->assertEquals($json, $directContext);
    }

    #[Test]
    public function test_2_live_holiday_list_and_off_days_context_props_returned()
    {
        $client = $this->createClientWithBranch([
            'company_name' => 'HOLIDAY_CONTEXT_CLIENT',
            'weekly_off_pattern' => 'sat,sun',
        ]);

        Holiday::create([
            'client_id' => $client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        $response = $this->actingAs($this->admin)->getJson("/payroll/attendance/context?client_id={$client->id}&target_month=2026-08");
        $response->assertStatus(200);

        $json = $response->json();
        $this->assertCount(1, $json['holidays']);
        $this->assertEquals('Aug 15, 2026', $json['holidays'][0]['date']);
        $this->assertEquals('Independence Day', $json['holidays'][0]['name']);
        $this->assertTrue($json['holidays'][0]['is_off_day']); // Aug 15, 2026 is Saturday!
    }

    #[Test]
    public function test_3_improved_plain_language_error_message_format()
    {
        $client = $this->createClientWithBranch([
            'company_name' => 'MSG_TEST_CLIENT',
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
            'employee_code' => 'MSG-001',
            'date_of_joining' => '2026-01-01',
        ]);

        // Upload 25 present / 2 LOP = 27 total (available slots = 25)
        $csvPath = $this->createTestCsv([
            ['code' => 'MSG-001', 'present' => 25, 'lop' => 2]
        ]);

        $result = $this->uploadService->validateFile($csvPath, $client->id, '2026-08');
        @unlink($csvPath);

        $this->assertEquals(1, $result['error_count']);
        $this->assertStringContainsString("You entered 27 total days (25 present + 2 LOP)", $result['rows'][0]['notes']);
        $this->assertStringContainsString("MSG_TEST_CLIENT's real working days this month are only 25", $result['rows'][0]['notes']);
        $this->assertStringContainsString("(31 days − 5 Sundays − 1 holiday(s))", $result['rows'][0]['notes']);
        $this->assertStringContainsString("they should add up to 25, not 27", $result['rows'][0]['notes']);
    }
}
