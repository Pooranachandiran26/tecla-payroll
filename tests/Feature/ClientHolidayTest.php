<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ClientHolidayTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected Employee $employee;

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
            'personal_email' => 'holiday_test@example.com',
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Add Holiday Success
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_add_holiday_success()
    {
        $this->actingAs($this->admin);

        $payload = [
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ];

        $response = $this->post(route('clients.holidays.store', $this->client->id), $payload);
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // DB Proof: Holiday row created
        $this->assertDatabaseHas('holidays', [
            'client_id' => $this->client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => 0,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: Duplicate Holiday Date Fails Cleanly (No Raw SQL Exception)
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_duplicate_holiday_date_fails_validation()
    {
        // Pre-create holiday on 2026-08-15
        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => '2026-08-15',
            'name' => 'Independence Day',
            'is_optional' => false,
        ]);

        $this->actingAs($this->admin);

        // Attempt adding another holiday on same date for same client
        $payload = [
            'holiday_date' => '2026-08-15',
            'name' => 'Duplicate Independence Day',
            'is_optional' => false,
        ];

        $response = $this->post(route('clients.holidays.store', $this->client->id), $payload);
        
        // Assert clean validation error session response, NO raw SQL exception
        $response->assertSessionHasErrors('holiday_date');

        // Confirm DB count remains 1
        $this->assertDatabaseCount('holidays', 1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: Delete Holiday Success
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_delete_holiday_success()
    {
        $holiday = Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => '2026-10-02',
            'name' => 'Gandhi Jayanti',
            'is_optional' => false,
        ]);

        $this->actingAs($this->admin);

        $response = $this->delete(route('clients.holidays.destroy', [$this->client->id, $holiday->id]));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        // DB Proof: Holiday row removed
        $this->assertDatabaseMissing('holidays', [
            'id' => $holiday->id,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: AttendanceResolutionService Picks Up Newly Added Holiday End-to-End
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_resolution_service_picks_up_newly_added_holiday()
    {
        $this->actingAs($this->admin);

        $service = app(AttendanceResolutionService::class);

        // Resolution BEFORE adding holiday on Aug 14 (Friday)
        $resBefore = $service->resolveForEmployee($this->employee, '2026-08-01', '2026-08-31');

        // Add holiday via endpoint
        $this->post(route('clients.holidays.store', $this->client->id), [
            'holiday_date' => '2026-08-14', // Friday
            'name' => 'Eve Holiday',
            'is_optional' => false,
        ]);

        // Resolution AFTER adding holiday on Aug 14
        $resAfter = $service->resolveForEmployee($this->employee, '2026-08-01', '2026-08-31');

        // Aug 14 (Friday) converted from work_day (LOP) to paid holiday
        // Result: paid_days + 1, lop_days - 1
        $this->assertEquals($resBefore['paid_days'] + 1, $resAfter['paid_days']);
        $this->assertEquals($resBefore['lop_days'] - 1, $resAfter['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: Client Detail Page Renders Holiday Section via Inertia
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_client_detail_page_renders_holiday_section()
    {
        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => '2026-12-25',
            'name' => 'Christmas',
            'is_optional' => false,
        ]);

        $this->actingAs($this->admin);

        $response = $this->get(route('clients.show', $this->client->id));
        $response->assertStatus(200);

        // REAL Inertia Rendering Verification: Component & holidays prop presence
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Clients/ClientDetail')
            ->has('client.data.holidays', 1)
            ->where('client.data.holidays.0.name', 'Christmas')
            ->where('client.data.holidays.0.holiday_date', '2026-12-25')
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 6: Deleted Holiday Does NOT Mutate Locked Payroll Run Items (Immutability)
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_6_deleted_holiday_does_not_mutate_locked_payroll_run_items()
    {
        // 1. Create holiday on 2026-07-15
        $holiday = Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => '2026-07-15',
            'name' => 'July Special Holiday',
            'is_optional' => false,
        ]);

        // 2. Create payroll run in processing status, add item, then lock run
        $payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'processing',
            'processed_by' => $this->admin->id,
        ]);

        $payrollItem = PayrollRunItem::create([
            'payroll_run_id' => $payrollRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30,
            'lop_days' => 1,
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 20000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 18000,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'attendance_source' => 'live_punch',
        ]);

        $payrollRun->update(['status' => 'locked']);

        // 3. Admin deletes the holiday row
        $this->actingAs($this->admin);
        $this->delete(route('clients.holidays.destroy', [$this->client->id, $holiday->id]));

        // 4. Verify historical locked payroll_run_items remained 100% immutable and untouched
        $payrollItem->refresh();
        $this->assertEquals(30, $payrollItem->paid_days);
        $this->assertEquals(1, $payrollItem->lop_days);
        $this->assertEquals(15000, $payrollItem->basic_pay);
        $this->assertEquals(18000, $payrollItem->net_pay);
    }
}
