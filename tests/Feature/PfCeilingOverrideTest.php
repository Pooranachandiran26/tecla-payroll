<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Employee;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PfCeilingOverrideTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_default_pf_ceiling_15000_is_used_when_client_has_default()
    {
        $client = Client::factory()->create(['pf_ceiling' => 15000]);
        $service = app(SalaryCalculationService::class);

        $calc = $service->calculateStructuralSalary([
            'client_id' => $client->id,
            'basic_pay' => 25000,
            'pf_applicable' => true,
        ]);

        // 15000 * 12% = 1800
        $this->assertEquals(1800.00, $calc['employee_pf_monthly']);
    }

    #[Test]
    public function test_custom_client_pf_ceiling_override_is_respected()
    {
        $client = Client::factory()->create(['pf_ceiling' => 20000]);
        $service = app(SalaryCalculationService::class);

        $calc = $service->calculateStructuralSalary([
            'client_id' => $client->id,
            'basic_pay' => 25000,
            'pf_applicable' => true,
        ]);

        // min(25000, 20000) * 12% = 2400
        $this->assertEquals(2400.00, $calc['employee_pf_monthly']);
    }
}
