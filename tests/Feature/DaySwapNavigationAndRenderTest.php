<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DaySwapNavigationAndRenderTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;
    protected Client $client;

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
            'personal_email' => 'nav_test@example.com',
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'email' => 'nav_test@example.com',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Admin Day Swap Requests Page Renders Correctly via Inertia
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_admin_day_swaps_page_renders_correctly()
    {
        $this->actingAs($this->admin);

        $response = $this->get(route('employees.day-swaps'));
        $response->assertStatus(200);

        // REAL Inertia Component Resolution Verification
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Employees/DaySwapRequests')
            ->has('requests')
            ->has('clients')
            ->has('filters')
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: Employee Portal Day Swap Page Renders Correctly via Inertia
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_employee_day_swaps_page_renders_correctly()
    {
        $this->actingAs($this->employeeUser);

        $response = $this->get(route('employee.day-swaps.index'));
        $response->assertStatus(200);

        // REAL Inertia Component Resolution Verification
        $response->assertInertia(fn (Assert $page) => $page
            ->component('EmployeePortal/DaySwapRequests')
            ->has('requests')
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: Employee Submits Swap and Sees It Rendered in Request History
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_employee_submits_swap_and_sees_it_in_history()
    {
        $this->actingAs($this->employeeUser);

        // 1. Submit swap via POST
        $postResponse = $this->post(route('employee.day-swaps.store'), [
            'original_date' => '2026-07-25',
            'new_date' => '2026-07-28',
            'reason' => 'Rendering verification swap request',
        ]);
        $postResponse->assertRedirect();

        // 2. GET the page and confirm the rendered Inertia props contain the submitted request
        $getReponse = $this->get(route('employee.day-swaps.index'));
        $getReponse->assertStatus(200);

        $getReponse->assertInertia(fn (Assert $page) => $page
            ->component('EmployeePortal/DaySwapRequests')
            ->has('requests', 1)
            ->where('requests.0.originalDate', '2026-07-25')
            ->where('requests.0.newDate', '2026-07-28')
            ->where('requests.0.reason', 'Rendering verification swap request')
            ->where('requests.0.status', 'pending')
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: Navigation Links Present in Navigation Constants
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_navigation_constants_file_contains_links()
    {
        $navContent = file_get_contents(resource_path('js/Constants/navigation.js'));

        // Confirm Admin subnav entry exists
        $this->assertStringContainsString('Day Swap Requests', $navContent);
        $this->assertStringContainsString('employees.day-swaps', $navContent);

        // Confirm Employee Portal navbar entry exists
        $this->assertStringContainsString('Day Swaps', $navContent);
        $this->assertStringContainsString('employee.day-swaps.index', $navContent);
    }
}
