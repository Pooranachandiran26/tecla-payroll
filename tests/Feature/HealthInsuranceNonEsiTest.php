<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Http\Resources\EmployeeResource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HealthInsuranceNonEsiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TEST 1: Non-ESI Employee saves health insurance provider, policy number, sum insured
     */
    #[Test]
    public function test_non_esi_employee_stores_group_medical_insurance_fields(): void
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 30000.00,
            'esi_applicable' => false,
            'health_insurance_provider' => 'Star Health Insurance',
            'health_insurance_policy_no' => 'GMI-2026-998811',
            'health_insurance_sum_insured' => 500000.00,
            'pan_number' => 'PANINS001',
            'aadhaar_number' => '999911112222',
            'bank_account_number' => '100020003000',
            'uan_mode' => 'existing_transfer',
        ]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'esi_applicable' => false,
            'health_insurance_provider' => 'Star Health Insurance',
            'health_insurance_policy_no' => 'GMI-2026-998811',
            'health_insurance_sum_insured' => 500000.00,
        ]);
    }

    /**
     * TEST 2: EmployeeResource exposes health_insurance fields and is_esi_active status
     */
    #[Test]
    public function test_employee_resource_exposes_health_insurance_fields_and_esi_active_status(): void
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $nonEsiEmp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 25000.00,
            'esi_applicable' => false,
            'health_insurance_provider' => 'HDFC ERGO',
            'health_insurance_policy_no' => 'HDFC-GMI-7762',
            'health_insurance_sum_insured' => 300000.00,
            'pan_number' => 'PANINS002',
            'aadhaar_number' => '999911112223',
            'bank_account_number' => '100020003001',
            'uan_mode' => 'existing_transfer',
        ]);

        $resourceArray = (new EmployeeResource($nonEsiEmp))->resolve();

        $this->assertFalse($resourceArray['is_esi_active']);
        $this->assertEquals('HDFC ERGO', $resourceArray['health_insurance_provider']);
        $this->assertEquals('HDFC-GMI-7762', $resourceArray['health_insurance_policy_no']);
        $this->assertEquals(300000.00, $resourceArray['health_insurance_sum_insured']);
    }

    /**
     * TEST 3: Nullable insurance fields do not block saving employee when left blank
     */
    #[Test]
    public function test_health_insurance_fields_are_strictly_optional(): void
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 25000.00,
            'esi_applicable' => false,
            'health_insurance_provider' => null,
            'health_insurance_policy_no' => null,
            'health_insurance_sum_insured' => null,
            'pan_number' => 'PANINS003',
            'aadhaar_number' => '999911112224',
            'bank_account_number' => '100020003002',
            'uan_mode' => 'existing_transfer',
        ]);

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'esi_applicable' => false,
            'health_insurance_provider' => null,
            'health_insurance_policy_no' => null,
            'health_insurance_sum_insured' => null,
        ]);
    }
}
