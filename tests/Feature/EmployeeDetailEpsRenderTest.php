<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;

class EmployeeDetailEpsRenderTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_1_employee_detail_payload_includes_correct_epf_and_eps_amounts_for_normal_eligible_employee()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
        ]);

        $user = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($user)->get(route('employees.show', $employee->id));
        $response->assertStatus(200);

        $page = $response->original->getData()['page'];
        $raw = $page['props']['employee'];
        $empData = is_array($raw) ? (isset($raw['data']) ? $raw['data'] : $raw) : $raw->resolve();

        $this->assertEquals(550.50, $empData['employer_epf_monthly']);
        $this->assertEquals(1249.50, $empData['employer_eps_monthly']);
        $this->assertTrue($empData['eps_applicable']);
    }

    /** @test */
    public function test_2_employee_detail_payload_includes_full_epf_and_zero_eps_for_age_58_plus_employee()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // Born in 1965 (Age 61 in 2026 -> Age 58+ Cutoff)
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1965-01-01',
        ]);

        $user = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($user)->get(route('employees.show', $employee->id));
        $response->assertStatus(200);

        $page = $response->original->getData()['page'];
        $raw = $page['props']['employee'];
        $empData = is_array($raw) ? (isset($raw['data']) ? $raw['data'] : $raw) : $raw->resolve();

        $this->assertEquals(1800.00, $empData['employer_epf_monthly']);
        $this->assertEquals(0.00, $empData['employer_eps_monthly']);
    }

    /** @test */
    public function test_3_employee_detail_payload_includes_full_epf_and_zero_eps_for_eps_disabled_employee()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'pf_applicable' => true,
            'eps_applicable' => false,
            'date_of_birth' => '1990-01-01',
        ]);

        $user = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($user)->get(route('employees.show', $employee->id));
        $response->assertStatus(200);

        $page = $response->original->getData()['page'];
        $raw = $page['props']['employee'];
        $empData = is_array($raw) ? (isset($raw['data']) ? $raw['data'] : $raw) : $raw->resolve();

        $this->assertEquals(1800.00, $empData['employer_epf_monthly']);
        $this->assertEquals(0.00, $empData['employer_eps_monthly']);
        $this->assertFalse($empData['eps_applicable']);
    }
}
