<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ClientHealthInsuranceToggleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TEST 1: Client statutoryDefaults endpoint exposes healthInsuranceEnabled flag
     */
    #[Test]
    public function test_client_statutory_defaults_returns_health_insurance_enabled(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'must_change_password' => false]);
        $client = Client::factory()->create(['health_insurance_enabled' => false]);

        $response = $this->actingAs($admin)->get(route('clients.statutoryDefaults', $client));

        $response->assertStatus(200);
        $response->assertJson([
            'healthInsuranceEnabled' => false,
            'health_insurance_enabled' => false,
        ]);
    }

    /**
     * TEST 2: Existing saved health insurance data is preserved and displayed even if client later toggles health_insurance_enabled to false (Option 1)
     */
    #[Test]
    public function test_existing_employee_insurance_data_preserved_when_client_toggles_insurance_off(): void
    {
        $client = Client::factory()->create(['health_insurance_enabled' => true]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $emp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 30000.00,
            'esi_applicable' => false,
            'health_insurance_provider' => 'Care Health Insurance',
            'health_insurance_policy_no' => 'CARE-POLICY-9900',
            'health_insurance_sum_insured' => 500000.00,
            'pan_number' => 'PANCLT001',
            'aadhaar_number' => '999900001111',
            'bank_account_number' => '100020003000',
            'uan_mode' => 'existing_transfer',
        ]);

        // Client later toggles health_insurance_enabled to false
        $client->update(['health_insurance_enabled' => false]);

        // Reload employee and assert insurance fields remain intact in DB
        $emp->refresh();
        $this->assertEquals('Care Health Insurance', $emp->health_insurance_provider);
        $this->assertEquals('CARE-POLICY-9900', $emp->health_insurance_policy_no);
        $this->assertEquals(500000.00, $emp->health_insurance_sum_insured);
        $this->assertFalse($client->fresh()->health_insurance_enabled);
    }

    /**
     * TEST 3: Updating client via PUT request with healthInsuranceEnabled = false persists to DB correctly
     */
    #[Test]
    public function test_updating_client_with_health_insurance_off_persists_false_in_db(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'must_change_password' => false]);
        $client = Client::factory()->create(['health_insurance_enabled' => true]);
        ClientBranch::factory()->create(['client_id' => $client->id]);

        $payload = [
            'name' => $client->company_name,
            'type' => $client->company_type,
            'code' => $client->client_code,
            'pan' => 'ABCDE1234F',
            'status' => 'active',
            'country' => 'India',
            'regAddressLine1' => '123 Main Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10.0,
            'contractStart' => '2026-01-01',
            'locationsCount' => 1,
            'healthInsuranceEnabled' => false,
            'poc1' => [
                'name' => 'John Primary POC',
                'email' => 'john.poc@example.com',
                'phone' => '9876543210',
            ],
        ];

        $response = $this->actingAs($admin)->put(route('clients.update', $client), $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
        $this->assertFalse((bool)$client->fresh()->health_insurance_enabled);
    }
}
