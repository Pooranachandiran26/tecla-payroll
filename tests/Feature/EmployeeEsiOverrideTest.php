<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeEsiOverrideTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_employee_with_esi_disabled()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['esi_applicable' => true]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        $payload = [
            'clientPartner' => $client->id,
            'branchPartner' => $branch->id,
            'firstName' => 'John',
            'lastName' => 'Doe',
            'fatherName' => 'Father Doe',
            'personalEmail' => 'john.doe.esi@example.com',
            'phone' => '9876543210',
            'dob' => '1990-01-01',
            'doj' => '2025-01-01',
            'designation' => 'Software Engineer',
            'gender' => 'male',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => '123 Main St',
            'accountNo' => '123456789012',
            'ifsc' => 'SBIN0001234',
            'bankName' => 'State Bank of India',
            'bank_name' => 'State Bank of India',
            'bankBranch' => 'Chennai',
            'bank_branch' => 'Chennai',
            'accountHolder' => 'John Doe',
            'pan' => 'ABCDE1234F',
            'esiToggle' => false, // Turning off ESI override
            'esi_applicable' => false,
            'pfToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'taxRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '30',
            'basicSal' => 10000,
            'hraSal' => 4000,
            'conveyanceSal' => 1000,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'declarations' => 'yes',
        ];

        $response = $this->actingAs($admin)->post(route('employees.store'), $payload);

        $response->assertRedirect(route('employees.index'));
        
        $employee = Employee::where('personal_email', 'john.doe.esi@example.com')->first();
        $this->assertNotNull($employee);
        $this->assertEquals(0, $employee->esi_applicable);
    }

    public function test_can_update_employee_and_turn_off_esi()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['esi_applicable' => true]);
        $branch = \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'esi_applicable' => true,
        ]);

        $payload = [
            'clientPartner' => $client->id,
            'branchPartner' => $branch->id,
            'firstName' => $employee->first_name ?: 'John',
            'first_name' => $employee->first_name ?: 'John',
            'lastName' => $employee->last_name ?: 'Doe',
            'last_name' => $employee->last_name ?: 'Doe',
            'fatherName' => $employee->father_name ?: 'Father',
            'father_name' => $employee->father_name ?: 'Father',
            'personalEmail' => $employee->personal_email,
            'phone' => $employee->phone_number,
            'dob' => is_string($employee->date_of_birth) ? substr($employee->date_of_birth, 0, 10) : $employee->date_of_birth->format('Y-m-d'),
            'doj' => is_string($employee->date_of_joining) ? substr($employee->date_of_joining, 0, 10) : $employee->date_of_joining->format('Y-m-d'),
            'designation' => $employee->designation,
            'gender' => $employee->gender ?: 'male',
            'empType' => $employee->employment_model ?: 'eor',
            'priorEmploymentFlag' => false,
            'address' => $employee->residential_address ?: '123 Main St',
            'accountNo' => '123456789012',
            'ifsc' => 'SBIN0001234',
            'bankName' => 'State Bank of India',
            'bank_name' => 'State Bank of India',
            'bankBranch' => 'Chennai',
            'bank_branch' => 'Chennai',
            'accountHolder' => $employee->full_name,
            'pan' => 'ABCDE1234F',
            'esiToggle' => false, // Turning off ESI override
            'esi_applicable' => false,
            'pfToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'taxRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '30',
            'basicSal' => 10000,
            'hraSal' => 4000,
            'conveyanceSal' => 1000,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'declarations' => 'yes',
        ];

        $response = $this->actingAs($admin)->put(route('employees.update', $employee->id), $payload);

        $response->assertRedirect(route('employees.index'));

        $employee->refresh();
        $this->assertEquals(0, $employee->esi_applicable);
    }
}
