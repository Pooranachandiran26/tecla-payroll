<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class WeeklyOffPatternUiTest extends TestCase
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

    private function createClientWithBranch(array $attributes = []): Client
    {
        $client = Client::factory()->create($attributes);
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    #[Test]
    public function test_1_client_weekly_off_pattern_saves_from_ui_payload()
    {
        $this->actingAs($this->admin);
        
        $clientData = [
            'name' => 'UI Saved Client Corp',
            'code' => 'UISC01',
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
            'weeklyOffPattern' => 'sun',
            'weekly_off_pattern' => 'sun',
            'poc1' => [
                'name' => 'John POC',
                'email' => 'poc_u1@test.com',
                'phone' => '9876543210',
            ]
        ];

        $response = $this->post(route('clients.store'), $clientData);
        $response->assertRedirect();

        $createdClient = Client::where('client_code', 'UISC01')->firstOrFail();
        $this->assertEquals('sun', $createdClient->weekly_off_pattern);

        $this->assertDatabaseHas('clients', [
            'id' => $createdClient->id,
            'weekly_off_pattern' => 'sun',
        ]);
    }

    #[Test]
    public function test_2_employee_weekly_off_pattern_override_saves_and_takes_priority()
    {
        $this->actingAs($this->admin);
        
        // Client default is 'sat,sun'
        $client = $this->createClientWithBranch(['weekly_off_pattern' => 'sat,sun']);

        // Employee 1: inherits client default (weekly_off_pattern = null)
        $empDefault = Employee::factory()->create([
            'client_id' => $client->id,
            'weekly_off_pattern' => null,
            'date_of_joining' => '2026-01-01',
            'personal_email' => 'emp1_def@test.com',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '100000000001',
            'bank_account_number' => '111111111111',
        ]);

        // Employee 2: overridden pattern via UI ('sun' only)
        $empOverride = Employee::factory()->create([
            'client_id' => $client->id,
            'weekly_off_pattern' => 'sun',
            'date_of_joining' => '2026-01-01',
            'personal_email' => 'emp2_ovr@test.com',
            'pan_number' => 'FGHIJ2222B',
            'aadhaar_number' => '200000000002',
            'bank_account_number' => '222222222222',
        ]);

        // Assert DB state
        $this->assertDatabaseHas('employees', [
            'id' => $empOverride->id,
            'weekly_off_pattern' => 'sun',
        ]);

        // Test resolution hierarchy on a Saturday (2026-07-18 is Saturday)
        $saturdayDate = '2026-07-18'; // Saturday

        $defaultResult = $this->resolutionService->resolveDayTypeForEmployee($empDefault, $saturdayDate);
        $overrideResult = $this->resolutionService->resolveDayTypeForEmployee($empOverride, $saturdayDate);

        // Employee 1 (client default sat,sun) => Saturday is weekly_off
        $this->assertEquals('weekly_off', $defaultResult['effective_type']);

        // Employee 2 (override 'sun') => Saturday is work_day!
        $this->assertEquals('work_day', $overrideResult['effective_type']);
    }

    #[Test]
    public function test_3_edit_client_and_employee_pre_populates_saved_pattern()
    {
        $this->actingAs($this->admin);

        $client = $this->createClientWithBranch(['weekly_off_pattern' => 'fri,sat']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'weekly_off_pattern' => 'sun',
            'personal_email' => 'emp_edit_3@test.com',
            'pan_number' => 'KLMNO3333C',
            'aadhaar_number' => '300000000003',
            'bank_account_number' => '333333333333',
        ]);

        // Check ClientDetail response payload
        $clientResponse = $this->get(route('clients.show', $client->id));
        $clientResponse->assertOk();
        $clientData = $clientResponse->original->getData()['page']['props']['client'];
        $pattern = is_array($clientData) ? ($clientData['weekly_off_pattern'] ?? $clientData['data']['weekly_off_pattern'] ?? null) : $clientData->weekly_off_pattern;
        $this->assertEquals('fri,sat', $pattern);

        // Check Employee Edit response payload
        $empResponse = $this->get(route('employees.edit', $employee->id));
        $empResponse->assertOk();
        $empData = $empResponse->original->getData()['page']['props']['employee'];
        $empPattern = is_array($empData) ? ($empData['weekly_off_pattern'] ?? $empData['data']['weekly_off_pattern'] ?? null) : $empData->weekly_off_pattern;
        $this->assertEquals('sun', $empPattern);
    }

    #[Test]
    public function test_4_inertia_render_contains_weekly_off_pattern_field()
    {
        $this->actingAs($this->admin);

        $client = $this->createClientWithBranch(['weekly_off_pattern' => 'thu,fri']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'weekly_off_pattern' => 'mon,tue',
            'personal_email' => 'emp_inertia_4@test.com',
            'pan_number' => 'PQRST4444D',
            'aadhaar_number' => '400000000004',
            'bank_account_number' => '444444444444',
        ]);

        // ClientDetail Inertia assertion (ClientResource renders data under data key or direct props)
        $this->get(route('clients.show', $client->id))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Clients/ClientDetail')
                ->where('client.data.weekly_off_pattern', 'thu,fri')
            );

        // Employee Form Inertia assertion (passed directly as model)
        $this->get(route('employees.edit', $employee->id))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/EmployeeForm')
                ->where('employee.weekly_off_pattern', 'mon,tue')
            );
    }

    #[Test]
    public function test_5_statutory_defaults_endpoint_returns_weekly_off_pattern()
    {
        $this->actingAs($this->admin);

        $client = $this->createClientWithBranch(['weekly_off_pattern' => 'sun']);

        $response = $this->get(route('clients.statutoryDefaults', $client->id));
        $response->assertOk();
        $response->assertJson([
            'weekly_off_pattern' => 'sun',
            'weeklyOffPattern' => 'sun',
        ]);
    }
}
