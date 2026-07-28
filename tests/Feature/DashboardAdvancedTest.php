<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\SalaryRevision;

class DashboardAdvancedTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'email' => 'admin.dashboard@example.com',
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false,
        ]);

        $this->client = Client::factory()->create([
            'client_code' => 'CL-DASH',
            'company_name' => 'Dashboard Test Corp',
            'contract_type' => 'eor',
            'status' => 'active',
        ]);

        $branch = \App\Models\ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Head Office',
            'state' => 'Maharashtra',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-DASH-01',
            'full_name' => 'Dashboard User',
            'status' => 'active',
            'basic_pay' => 40000,
            'hra' => 16000,
            'conveyance' => 2000,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 5000,
            'other_additions' => 0,
            'net_take_home_monthly' => 58000,
            'ctc_monthly' => 63000,
        ]);
    }

    /** @test */
    public function test_dashboard_renders_successfully_with_real_metrics()
    {
        $response = $this->actingAs($this->admin)->get(route('dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Dashboard')
            ->has('metrics')
            ->where('metrics.totalActiveEmployees', 1)
            ->where('metrics.totalClients', 1)
            ->where('metrics.monthlyCtcTotal', 63000)
            ->has('todayAttendance')
            ->has('recentEmployees')
            ->has('topClients')
        );
    }

    /** @test */
    public function test_dashboard_filters_metrics_by_client_id()
    {
        $response = $this->actingAs($this->admin)->get(route('dashboard', ['client_id' => $this->client->id]));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Dashboard')
            ->where('selectedClientId', $this->client->id)
            ->has('selectedClient')
            ->where('selectedClient.company_name', 'Dashboard Test Corp')
            ->where('metrics.totalActiveEmployees', 1)
            ->where('metrics.monthlyCtcTotal', 63000)
        );
    }
}
