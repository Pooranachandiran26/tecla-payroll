<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\EmployeeDocument;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

class PayrollCycleWarningTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PtSlabSeeder::class);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    /**
     * Helper to setup a standard ESI/PF active employee to avoid blockers.
     */
    protected function createEmployeeForClient(Client $client)
    {
        $this->branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'HQ Branch',
            'state' => 'Maharashtra',
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $employee = Employee::create([
            'client_id' => $client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Test Employee',
            'personal_email' => 'test@example.com',
            'phone_number' => '9988776655',
            'date_of_birth' => '1995-05-05',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => 'HQ Address',
            'bank_account_number' => '1234567890',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Test Employee',
            'pan_number' => 'ABCDE1234F',
            'employee_code' => 'TEC-TEST',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0, 'da' => 0, 'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'tds_regime' => 'new', 'gratuity_mode' => 'part_of_ctc', 'lop_basis_days' => '30', 'declarations_accepted' => 1,
            'pf_applicable' => true, 'esi_applicable' => false, 'pt_applicable' => true, 'lwf_applicable' => false,
        ]);

        foreach ($employee->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $employee->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        return $employee;
    }

    /**
     * Test 1: calendar_month_process_before_month_end_warns
     */
    public function test_calendar_month_process_before_month_end_warns()
    {
        // July 2026 calendar month: ends July 31
        $client = Client::factory()->create([
            'status' => 'active',
            'payroll_convention' => 'calendar_month',
        ]);
        $this->createEmployeeForClient($client);

        // 5 days before July 31 is July 26
        Carbon::setTestNow(Carbon::parse('2026-07-26'));

        $response = $this->actingAs($this->admin)->get(route('payroll.processing', [
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(function (Assert $page) {
            $preflight = $page->toArray()['props']['preflight'] ?? [];
            $this->assertNotEmpty($preflight);
            $warning = collect($preflight)->firstWhere('type', 'amber');
            $this->assertNotNull($warning);
            $this->assertStringContainsString("Payroll cycle hasn't ended yet — 5 days remaining", $warning['msg']);
        });

        Carbon::setTestNow(); // Reset time
    }

    /**
     * Test 2: custom_cycle_spanning_two_months_computes_end_correctly
     */
    public function test_custom_cycle_spanning_two_months_computes_end_correctly()
    {
        $client = Client::factory()->create([
            'payroll_convention' => 'custom_cycle',
            'custom_cycle_start_day' => 26,
            'custom_cycle_end_day' => 25,
        ]);

        // payroll_month is July 2026
        $cycleStart = $client->getCycleStartDate('2026-07-01');
        $cycleEnd = $client->getCycleEndDate('2026-07-01');

        $this->assertEquals('2026-06-26', $cycleStart->toDateString());
        $this->assertEquals('2026-07-25', $cycleEnd->toDateString());
    }

    /**
     * Test 3: process_after_cycle_end_no_warning
     */
    public function test_process_after_cycle_end_no_warning()
    {
        $client = Client::factory()->create([
            'status' => 'active',
            'payroll_convention' => 'custom_cycle',
            'custom_cycle_start_day' => 26,
            'custom_cycle_end_day' => 25,
        ]);
        $this->createEmployeeForClient($client);

        // Today is July 26, 2026 (cycle ended July 25, 2026)
        Carbon::setTestNow(Carbon::parse('2026-07-26'));

        $response = $this->actingAs($this->admin)->get(route('payroll.processing', [
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(function (Assert $page) {
            $preflight = $page->toArray()['props']['preflight'] ?? [];
            $warning = collect($preflight)->firstWhere('type', 'amber');
            $infoWarning = collect($preflight)->firstWhere('type', 'info');
            $this->assertNull($warning);
            $this->assertNull($infoWarning);
        });

        Carbon::setTestNow();
    }

    /**
     * Test 4: processing_never_blocked_by_warning
     */
    public function test_processing_never_blocked_by_warning()
    {
        $client = Client::factory()->create([
            'status' => 'active',
            'payroll_convention' => 'calendar_month',
        ]);
        $this->createEmployeeForClient($client);

        // Today is July 10 (21 days before end of month)
        Carbon::setTestNow(Carbon::parse('2026-07-10'));

        $response = $this->actingAs($this->admin)->post('/payroll/runs', [
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
        ]);

        $response->assertStatus(302); // Redirect success
        $run = PayrollRun::where('client_id', $client->id)->where('payroll_month', '2026-07-01')->first();
        $this->assertNotNull($run);

        Carbon::setTestNow();
    }

    /**
     * Test 5: info_tier_within_3_days
     */
    public function test_info_tier_within_3_days()
    {
        $client = Client::factory()->create([
            'status' => 'active',
            'payroll_convention' => 'calendar_month',
        ]);
        $this->createEmployeeForClient($client);

        // July 29 is 2 days before July 31
        Carbon::setTestNow(Carbon::parse('2026-07-29'));

        $response = $this->actingAs($this->admin)->get(route('payroll.processing', [
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(function (Assert $page) {
            $preflight = $page->toArray()['props']['preflight'] ?? [];
            $warning = collect($preflight)->firstWhere('type', 'info');
            $this->assertNotNull($warning);
            $this->assertStringContainsString("Payroll cycle ends in 2 day(s)", $warning['msg']);
        });

        Carbon::setTestNow();
    }

    /**
     * Test 6: strong_warning_very_early
     */
    public function test_strong_warning_very_early()
    {
        $client = Client::factory()->create([
            'status' => 'active',
            'payroll_convention' => 'calendar_month',
        ]);
        $this->createEmployeeForClient($client);

        // July 15 is 16 days before July 31
        Carbon::setTestNow(Carbon::parse('2026-07-15'));

        $response = $this->actingAs($this->admin)->get(route('payroll.processing', [
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
        ]));

        $response->assertStatus(200);
        $response->assertInertia(function (Assert $page) {
            $preflight = $page->toArray()['props']['preflight'] ?? [];
            $warning = collect($preflight)->firstWhere('type', 'amber');
            $this->assertNotNull($warning);
            $this->assertStringContainsString("Very early processing — cycle just started, 16 days remaining", $warning['msg']);
        });

        Carbon::setTestNow();
    }

    /**
     * Test 7: null_convention_defaults_to_calendar_month
     */
    public function test_null_convention_defaults_to_calendar_month()
    {
        $client = Client::factory()->create([
            'status' => 'active',
            'payroll_convention' => null,
        ]);

        $cycleStart = $client->getCycleStartDate('2026-07-01');
        $cycleEnd = $client->getCycleEndDate('2026-07-01');

        $this->assertEquals('2026-07-01', $cycleStart->toDateString());
        $this->assertEquals('2026-07-31', $cycleEnd->toDateString());
    }

    public function test_custom_convention_equivalent_to_custom_cycle()
    {
        $client = Client::factory()->create([
            'payroll_convention' => 'custom',
            'custom_cycle_start_day' => 1,
            'custom_cycle_end_day' => 25,
        ]);

        $cycleStart = $client->getCycleStartDate('2026-07-01');
        $cycleEnd = $client->getCycleEndDate('2026-07-01');

        $this->assertEquals('2026-07-01', $cycleStart->toDateString());
        $this->assertEquals('2026-07-25', $cycleEnd->toDateString());
    }
}
