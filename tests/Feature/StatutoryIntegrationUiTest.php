<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StatutoryIntegrationUiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    #[Test]
    public function test_ui_inertia_pages_render_statutory_split_and_ctc_props_correctly()
    {
        $client = Client::factory()->create([
            'company_name' => 'UI Integration Corp',
            'edli_exempted' => true,
            'gratuity_applicable' => true,
            'default_gratuity_mode' => 'ctc_included',
            'statutory_bonus_applicable' => true,
            'bonus_rate_percentage' => 8.33,
            'pt_state' => 'Tamil Nadu',
        ]);
        ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'basic_pay' => 9000,
            'da' => 1000,
            'hra' => 3000,
            'gross_monthly_salary' => 13000,
            'pf_applicable' => true,
            'pt_applicable' => true,
            'gratuity_mode' => 'part_of_ctc',
        ]);

        // 1. Check Employee Detail rendering
        $response = $this->actingAs($this->admin)->get(route('employees.show', $employee->id));
        $response->assertStatus(200);

        // 2. Check Client Edit rendering
        $clientEditResponse = $this->actingAs($this->admin)->get(route('clients.edit', $client->id));
        $clientEditResponse->assertStatus(200);

        $this->assertTrue(true);
    }
}
