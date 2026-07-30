<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\EmployeeExit;

class EmployeeDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->manager = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        
        $this->client = Client::factory()->create(['status' => 'active']);
        
        $this->branch = \App\Models\ClientBranch::factory()->create([
            'client_id' => $this->client->id
        ]);
        
        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'status' => 'active'
        ]);
        
        $this->employeeUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $this->employee->id,
            'status' => 'active'
        ]);
    }

    public function test_delete_blocked_when_exit_in_progress()
    {
        EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'current_stage' => 3,
            'settlement_status' => 'draft'
        ]);

        $response = $this->actingAs($this->admin)->delete("/employees/{$this->employee->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Test deletion reason'
        ]);

        $response->assertSessionHas('error', 'Cannot delete: this employee has an in-progress exit. Complete or cancel it first.');
        $this->assertDatabaseHas('employees', ['id' => $this->employee->id, 'deleted_at' => null]);
    }

    public function test_delete_succeeds_after_exit_confirmed_and_soft_deletes_employee()
    {
        EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'current_stage' => 6,
            'settlement_status' => 'approved'
        ]);

        $response = $this->actingAs($this->admin)->delete("/employees/{$this->employee->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Test deletion reason'
        ]);

        $response->assertRedirect('/employees');
        $response->assertSessionHas('success', 'Employee deleted successfully.');
        
        $this->assertSoftDeleted('employees', ['id' => $this->employee->id]);
        $this->assertSoftDeleted('employee_exits', ['employee_id' => $this->employee->id]);
        
        $this->assertDatabaseHas('users', [
            'id' => $this->employeeUser->id,
            'status' => 'suspended',
            'suspended_reason' => 'employee_deleted'
        ]);
    }

    public function test_manager_cannot_delete_employee()
    {
        // Manager passes the 'role:admin,manager' route middleware, 
        // but is explicitly blocked by Gate::authorize('delete', $employee) inside the controller.
        $response = $this->actingAs($this->manager)->delete("/employees/{$this->employee->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Test deletion reason'
        ]);
        
        $response->dump();

        $response->assertStatus(403);
        $this->assertDatabaseHas('employees', ['id' => $this->employee->id, 'deleted_at' => null]);
    }

    public function test_deactivate_works_without_any_blocking_checks()
    {
        EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'current_stage' => 3, // In progress
            'settlement_status' => 'draft'
        ]);

        $response = $this->actingAs($this->manager)->post("/employees/{$this->employee->id}/deactivate");

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee deactivated successfully.');
        
        $this->assertDatabaseHas('employees', [
            'id' => $this->employee->id,
            'status' => 'suspended',
            'deleted_at' => null
        ]);
    }

    public function test_restore_reactivates_only_users_suspended_for_this_deletion()
    {
        // 1. Another user suspended for an unrelated reason, attached to a different employee
        $otherEmployee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'status' => 'active',
            'bank_account_number' => '123' . uniqid(),
            'pan_number' => 'ABC' . strtoupper(substr(uniqid(), -4)) . 'F',
            'aadhaar_number' => '123' . substr(uniqid('', true), -9),
        ]);

        $otherUser = User::factory()->create([
            'role' => 'employee',
            'employee_id' => $otherEmployee->id,
            'status' => 'suspended',
            'suspended_reason' => 'policy_violation'
        ]);

        // 2. Delete the employee
        $this->actingAs($this->admin)->delete("/employees/{$this->employee->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Test deletion reason'
        ]);

        $this->assertSoftDeleted('employees', ['id' => $this->employee->id]);
        
        // Employee user is suspended for deletion
        $this->assertDatabaseHas('users', [
            'id' => $this->employeeUser->id,
            'status' => 'suspended',
            'suspended_reason' => 'employee_deleted'
        ]);
        
        // Other user is still suspended for policy_violation
        $this->assertDatabaseHas('users', [
            'id' => $otherUser->id,
            'status' => 'suspended',
            'suspended_reason' => 'policy_violation'
        ]);

        // 3. Restore the employee
        $response = $this->actingAs($this->admin)->post("/employees/{$this->employee->id}/restore");
        $response->assertRedirect();

        $this->assertDatabaseHas('employees', [
            'id' => $this->employee->id,
            'deleted_at' => null
        ]);

        // Employee user is active again
        $this->assertDatabaseHas('users', [
            'id' => $this->employeeUser->id,
            'status' => 'active',
            'suspended_reason' => null
        ]);

        // Other user is STILL suspended for policy_violation (survived the restore!)
        $this->assertDatabaseHas('users', [
            'id' => $otherUser->id,
            'status' => 'suspended',
            'suspended_reason' => 'policy_violation'
        ]);
    }
}
