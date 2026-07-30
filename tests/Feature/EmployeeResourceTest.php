<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Http\Resources\EmployeeResource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_resource_returns_stored_pf_and_esi_values_without_recalculation()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        // Create an employee with Gross > 21,000 (Basic 22000, Gross 45000)
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 22000,
            'hra' => 11000,
            'conveyance' => 1600,
            'special_allowance' => 10400,
            'pf_applicable' => true,
            'esi_applicable' => true,
        ]);

        // Refresh model to get values persisted by EmployeeObserver
        $employee->refresh();

        // Verify database storage baseline
        $this->assertEquals(45000.00, $employee->gross_monthly_salary);
        $this->assertEquals(1800.00, $employee->employee_pf_monthly);
        $this->assertEquals(1950.00, $employee->employer_pf_monthly);
        $this->assertEquals(0.00, $employee->employee_esi_monthly);

        // Resolve resource
        $resourceData = (new EmployeeResource($employee))->resolve();

        // Assert JSON resource matches stored model values exactly
        $this->assertEquals(1800.00, $resourceData['employee_pf_monthly']);
        $this->assertEquals(0.00, $resourceData['employee_esi_monthly']);

        // Assert Employee PF does NOT equal Employer PF (which includes admin/EDLI charges = 1950)
        $this->assertNotEquals($resourceData['employer_pf_monthly'], $resourceData['employee_pf_monthly']);
    }
}
