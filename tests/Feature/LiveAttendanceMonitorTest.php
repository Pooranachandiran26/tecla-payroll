<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

class LiveAttendanceMonitorTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $clientA;
    protected $clientB;
    protected $employeeA;
    protected $employeeB;
    protected $targetDate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->clientA = Client::factory()->create(['status' => 'active']);
        $this->clientB = Client::factory()->create(['status' => 'active']);

        $branchA = ClientBranch::create([
            'client_id' => $this->clientA->id,
            'branch_name' => 'Branch A',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z5',
        ]);

        $branchB = ClientBranch::create([
            'client_id' => $this->clientB->id,
            'branch_name' => 'Branch B',
            'state' => 'Karnataka',
            'gstin' => '29ABCDE1234F1Z5',
        ]);

        $this->targetDate = Carbon::today()->toDateString();

        $this->employeeA = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branchA->id,
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeea@example.com',
            'bank_account_number' => '9999000011',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '100020003001',
        ]);

        $this->employeeB = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branchA->id,
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeeb@example.com',
            'bank_account_number' => '9999000022',
            'pan_number' => 'ABCDE1111B',
            'aadhaar_number' => '100020003002',
        ]);

        // Seeding real attendance punch for employeeA on targetDate
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => $this->targetDate,
            'punch_in_time' => '09:15:00',
            'punch_out_time' => '18:15:00',
            'hours_worked' => 9.0,
            'status' => 'present',
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Test live monitor displays the full active roster with correct statuses.
     */
    public function test_live_monitor_displays_full_roster_with_correct_statuses()
    {
        $response = $this->actingAs($this->admin)->get('/payroll/live-monitor');

        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/LiveAttendanceMonitor')
            ->has('punches', 2)
            ->where('punches.0.name', $this->employeeA->full_name)
            ->where('punches.0.status', 'present')
            ->where('punches.0.in', '09:15 AM')
            ->where('punches.0.out', '06:15 PM')
            ->where('punches.0.hours', '9h 0m')
            ->where('punches.1.name', $this->employeeB->full_name)
            ->where('punches.1.status', 'absent')
            ->where('punches.1.in', '—')
            ->where('punches.1.out', '—')
            ->where('punches.1.hours', '0h 0m')
        );
    }

    /**
     * Test live monitor filters dynamically by client ID.
     */
    public function test_live_monitor_filters_by_client()
    {
        // Add employee at Client B (no punch)
        $employeeC = Employee::factory()->create([
            'client_id' => $this->clientB->id,
            'branch_id' => \App\Models\ClientBranch::where('client_id', $this->clientB->id)->first()->id,
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeec@example.com',
            'bank_account_number' => '9999000033',
            'pan_number' => 'ABCDE1111C',
            'aadhaar_number' => '100020003003',
        ]);

        // Filter by Client B
        $response = $this->actingAs($this->admin)->get("/payroll/live-monitor?client_id={$this->clientB->id}");

        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/LiveAttendanceMonitor')
            ->has('punches', 1)
            ->where('punches.0.name', $employeeC->full_name)
            ->where('punches.0.status', 'absent')
        );
    }
}
