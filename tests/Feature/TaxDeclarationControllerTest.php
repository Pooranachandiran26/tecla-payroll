<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeTaxDeclaration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaxDeclarationControllerTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client;
    protected ClientBranch $branch;
    protected User $admin;
    protected User $employeeUser;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create(['company_name' => 'Declaration Test Corp']);
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Head HQ',
            'state' => 'Karnataka',
            'is_head_office' => true,
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        
        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 60000,
            'hra' => 30000,
            'conveyance' => 5000,
            'special_allowance' => 25000,
            'gross_monthly_salary' => 120000,
            'tds_applicable' => true,
        ]);

        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'status' => 'active',
        ]);
    }

    public function test_show_returns_declaration_and_comparison_json(): void
    {
        $response = $this->actingAs($this->admin)->getJson(route('employees.tax-declarations.show', $this->employee->id));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'employee_id',
                'financial_year',
                'declaration',
                'comparison' => [
                    'new_regime',
                    'old_regime',
                    'recommended_regime',
                    'annual_tax_savings',
                ]
            ]);
    }

    public function test_store_validates_and_creates_tax_declaration(): void
    {
        $payload = [
            'regime' => 'old',
            'ppf_amount' => 100000,
            'elss_amount' => 50000,
            'health_insurance_self' => 20000,
            'monthly_rent_paid' => 15000, // Annual rent 1,80,000 > 1L -> Landlord PAN mandatory
            'landlord_name' => 'Anand Sharma',
            'landlord_pan' => 'ABCDE1234F',
            'is_metro_city' => true,
        ];

        $response = $this->actingAs($this->employeeUser)->post(route('employees.tax-declarations.store', $this->employee->id), $payload);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('employee_tax_declarations', [
            'employee_id' => $this->employee->id,
            'regime' => 'old',
            'ppf_amount' => 100000,
            'landlord_pan' => 'ABCDE1234F',
            'status' => 'submitted',
        ]);
    }

    public function test_admin_can_verify_tax_declaration(): void
    {
        $declaration = EmployeeTaxDeclaration::create([
            'employee_id' => $this->employee->id,
            'financial_year' => '2026-2027',
            'regime' => 'old',
            'ppf_amount' => 100000,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($this->admin)->post(route('employees.tax-declarations.verify', [
            'id' => $this->employee->id,
            'declarationId' => $declaration->id,
        ]), [
            'status' => 'verified',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('employee_tax_declarations', [
            'id' => $declaration->id,
            'status' => 'verified',
            'verified_by' => $this->admin->id,
        ]);
    }
}
