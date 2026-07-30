<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;

class ClientDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Database\Eloquent\Model::unguard();
        
        // create admin
        $this->admin = User::create([
            'name' => 'Admin', 'email' => 'admin_test@test.com', 'password' => 'password', 'role' => 'admin', 'status' => 'active'
        ]);
        // create manager
        $this->manager = User::create([
            'name' => 'Manager', 'email' => 'manager_test@test.com', 'password' => 'password', 'role' => 'manager', 'status' => 'active'
        ]);
    }

    protected function createClient($overrides = [])
    {
        return Client::create(array_merge([
            'company_name' => 'Test Client',
            'client_code' => 'TC' . rand(100, 999),
            'status' => 'active',
            'contract_type' => 'agency',
            'contract_start_date' => '2026-01-01',
            'billing_model' => 'markup',
            'primary_poc_name' => 'POC Name',
            'primary_poc_email' => 'poc@test.com',
            'primary_poc_phone' => '9999999999',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '123 Test St',
            'registered_city' => 'Test City',
            'registered_state' => 'Test State',
            'registered_pin' => '123456',
        ], $overrides));
    }

    protected function createEmployee($overrides = [])
    {
        return Employee::create(array_merge([
            'employee_code' => 'E' . rand(100, 999),
            'client_id' => 1, // must be overridden
            'branch_id' => 1, // must be overridden
            'full_name' => 'Test Employee',
            'personal_email' => 'emp@test.com',
            'phone_number' => '1234567890',
            'date_of_birth' => '2000-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Developer',
            'employment_model' => 'agency_contract',
            'basic_pay' => 10000,
            'hra' => 5000,
            'conveyance' => 1600,
            'da' => 0,
            'medical_allowance' => 1250,
            'special_allowance' => 0,
            'gross_monthly_salary' => 17850,
            'net_take_home_monthly' => 15000,
            'employer_pf_monthly' => 1200,
            'employer_esi_monthly' => 500,
            'ctc_monthly' => 20000,
            'gratuity_mode' => 'part_of_ctc',
            'bank_account_number' => '123456789',
            'account_holder_name' => 'Test Emp',
            'bank_ifsc' => 'TEST0001',
            'bank_name' => 'Test Bank',
            'bank_branch' => 'Main',
            'uan_mode' => 'new',
            'pan_number' => 'ABCDE1234F',
            'status' => 'active'
        ], $overrides));
    }

    public function test_delete_blocked_when_active_employees_exist()
    {
        $client = $this->createClient(['company_name' => 'Test Client 1', 'client_code' => 'TC1']);
        $branch = ClientBranch::create(['client_id' => $client->id, 'branch_name' => 'HQ', 'is_head_office' => true]);
        $employee = $this->createEmployee([
            'client_id' => $client->id, 
            'branch_id' => $branch->id,
            'employee_code' => 'E01',
            'status' => 'active'
        ]);

        $response = $this->actingAs($this->admin)->delete("/clients/{$client->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Testing deletion blocked.'
        ]);

        $response->assertSessionHasErrors(['error']);
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'deleted_at' => null]);
    }

    public function test_delete_succeeds_after_employees_exited_and_soft_deletes_client()
    {
        $client = $this->createClient(['company_name' => 'Test Client 2', 'client_code' => 'TC2']);
        
        // Add related models to ensure soft deletion cascade
        $branch = ClientBranch::create(['client_id' => $client->id, 'branch_name' => 'HQ', 'is_head_office' => true]);
        $portalUser = User::create([
            'name' => 'Portal', 'email' => 'portal@test.com', 'password' => 'password', 'client_id' => $client->id, 'role' => 'client', 'status' => 'active'
        ]);
        $employee = $this->createEmployee([
            'client_id' => $client->id, 
            'branch_id' => $branch->id,
            'employee_code' => 'E02',
            'status' => 'exited'
        ]); // exited employee

        $response = $this->actingAs($this->admin)->delete("/clients/{$client->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Testing successful deletion.'
        ]);

        $response->assertSessionHas('success');
        
        // Check soft deletes
        $this->assertSoftDeleted('clients', ['id' => $client->id]);
        $this->assertSoftDeleted('client_branches', ['id' => $branch->id]);

        // Check user suspended
        $this->assertDatabaseHas('users', [
            'id' => $portalUser->id,
            'status' => 'suspended',
            'suspended_reason' => 'client_deleted'
        ]);
    }

    public function test_manager_cannot_delete_client()
    {
        $client = $this->createClient(['company_name' => 'Test Client 3', 'client_code' => 'TC3']);

        $response = $this->actingAs($this->manager)->delete("/clients/{$client->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Manager trying to delete.'
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'deleted_at' => null]);
    }

    public function test_deactivate_works_without_any_blocking_checks()
    {
        $client = $this->createClient(['company_name' => 'Test Client 4', 'client_code' => 'TC4']);
        $branch = ClientBranch::create(['client_id' => $client->id, 'branch_name' => 'HQ', 'is_head_office' => true]);
        // Create an active employee which would normally block a DELETE
        $employee = $this->createEmployee([
            'client_id' => $client->id, 
            'branch_id' => $branch->id,
            'employee_code' => 'E03',
            'status' => 'active'
        ]);

        $response = $this->actingAs($this->admin)->post("/clients/{$client->id}/deactivate");

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'status' => 'inactive',
            'deleted_at' => null
        ]);
    }
}
