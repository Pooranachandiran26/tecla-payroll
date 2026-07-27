<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PfCeilingOverrideTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function getValidClientPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'PF Ceiling Test Corp',
            'code' => 'PFC001',
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
            'pfCeiling' => 15000,
            'poc1' => [
                'name' => 'John POC',
                'email' => 'poc@pfc.com',
                'phone' => '9876543210',
            ]
        ], $overrides);
    }

    #[Test]
    public function test_setting_pf_ceiling_above_15000_is_rejected_by_validation()
    {
        $this->actingAs($this->admin);

        // 1. Store request with pfCeiling = 20000
        $payload = $this->getValidClientPayload(['pfCeiling' => 20000]);
        $response = $this->post(route('clients.store'), $payload);
        $response->assertSessionHasErrors('pf_ceiling');

        // 2. Update request with pfCeiling = 50000
        $client = Client::factory()->create(['pf_ceiling' => 15000]);
        $updatePayload = $this->getValidClientPayload(['pfCeiling' => 50000, 'code' => $client->client_code]);
        $updateResponse = $this->put(route('clients.update', $client->id), $updatePayload);
        $updateResponse->assertSessionHasErrors('pf_ceiling');
    }

    #[Test]
    public function test_setting_pf_ceiling_at_or_below_15000_is_accepted_and_applied()
    {
        $this->actingAs($this->admin);

        // 1. Setting 10000 (below statutory 15000) is accepted
        $payload = $this->getValidClientPayload(['pfCeiling' => 10000]);
        $response = $this->post(route('clients.store'), $payload);
        $response->assertRedirect();

        $client = Client::where('client_code', 'PFC001')->firstOrFail();
        $this->assertEquals(10000, (float) $client->pf_ceiling);

        // 2. Calculation correctly uses 10000 ceiling: min(25000, 10000) * 12% = 1200.00
        $service = app(SalaryCalculationService::class);
        $calc = $service->calculateStructuralSalary([
            'client_id' => $client->id,
            'basic_pay' => 25000,
            'pf_applicable' => true,
        ]);

        $this->assertEquals(1200.00, $calc['employee_pf_monthly']);
    }
}
