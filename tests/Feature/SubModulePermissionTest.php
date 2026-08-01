<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubModulePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $managerFull;
    protected User $managerRestricted;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->managerFull = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => [
                'candidates', 'emp_all', 'emp_create', 'emp_bulk_upload', 
                'emp_salary_revisions', 'emp_bank_change', 'emp_day_swaps', 
                'emp_leave_approval', 'emp_queries'
            ],
        ]);

        $this->managerRestricted = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => [
                'candidates', 'emp_all', 'emp_create' // Only all employees and create, no salary revisions or bank change
            ],
        ]);
    }

    public function test_1_admin_has_permission_for_all_sub_modules()
    {
        $this->assertTrue($this->admin->hasModulePermission('emp_salary_revisions', 'candidates'));
        $this->assertTrue($this->admin->hasModulePermission('emp_bank_change', 'candidates'));
        $this->assertTrue($this->admin->hasModulePermission('payroll_live_monitor', 'payroll'));
    }

    public function test_2_full_manager_has_permission_for_granted_sub_modules()
    {
        $this->assertTrue($this->managerFull->hasModulePermission('emp_salary_revisions', 'candidates'));
        $this->assertTrue($this->managerFull->hasModulePermission('emp_bank_change', 'candidates'));
        $this->assertTrue($this->managerFull->hasModulePermission('emp_queries', 'candidates'));
    }

    public function test_3_restricted_manager_lacks_permission_for_unassigned_sub_modules()
    {
        $this->assertTrue($this->managerRestricted->hasModulePermission('emp_all', 'candidates'));
        $this->assertTrue($this->managerRestricted->hasModulePermission('emp_create', 'candidates'));

        // Should return false for unassigned sub-modules
        $this->assertFalse($this->managerRestricted->hasModulePermission('emp_salary_revisions'));
        $this->assertFalse($this->managerRestricted->hasModulePermission('emp_bank_change'));
        $this->assertFalse($this->managerRestricted->hasModulePermission('emp_queries'));
    }

    public function test_4_user_management_module_permissions_update()
    {
        $newPermissions = ['candidates', 'emp_all', 'emp_salary_revisions', 'payroll', 'payroll_payslips'];

        $response = $this->actingAs($this->admin)->put(
            route('admin.users.update-module-permissions', $this->managerRestricted->id),
            ['module_permissions' => $newPermissions]
        );

        $response->assertSessionHasNoErrors();
        $freshManager = $this->managerRestricted->fresh();

        $this->assertTrue($freshManager->hasModulePermission('emp_salary_revisions'));
        $this->assertTrue($freshManager->hasModulePermission('payroll_payslips'));
        $this->assertFalse($freshManager->hasModulePermission('emp_bank_change'));
    }

    public function test_5_manager_without_admin_payslip_templates_permission_is_gated_with_403()
    {
        $response = $this->actingAs($this->managerRestricted)->get(route('admin.payslip-templates'));
        $response->assertStatus(403);
    }

    public function test_6_manager_with_only_activity_log_and_user_mgmt_permissions_cannot_access_active_sessions()
    {
        $managerWithPartialAdmin = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => ['admin', 'admin_activity_log', 'admin_users'], // admin_sessions is unchecked/missing
        ]);

        $this->assertTrue($managerWithPartialAdmin->hasModulePermission('admin_activity_log'));
        $this->assertTrue($managerWithPartialAdmin->hasModulePermission('admin_users'));
        $this->assertFalse($managerWithPartialAdmin->hasModulePermission('admin_sessions'));
        $this->assertFalse($managerWithPartialAdmin->hasModulePermission('admin_payslip_templates'));
        $this->assertFalse($managerWithPartialAdmin->hasModulePermission('admin_settings'));
    }

    public function test_7_manager_without_admin_sessions_permission_is_gated_with_403_on_sessions_route()
    {
        $managerWithPartialAdmin = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => ['admin', 'admin_activity_log', 'admin_users'], // admin_sessions is missing
        ]);

        $response = $this->actingAs($managerWithPartialAdmin)->get(route('admin.sessions'));
        $response->assertStatus(403);
    }

    public function test_8_manager_without_clients_create_permission_is_gated_with_403()
    {
        $managerWithoutClientCreate = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => ['clients', 'clients_index'], // clients_create missing
        ]);

        $response = $this->actingAs($managerWithoutClientCreate)->get(route('clients.create'));
        $response->assertStatus(403);
    }

    public function test_9_manager_without_emp_create_permission_is_gated_with_403()
    {
        $managerWithoutEmpCreate = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => ['candidates', 'emp_all'], // emp_create missing
        ]);

        $response = $this->actingAs($managerWithoutEmpCreate)->get(route('employees.create'));
        $response->assertStatus(403);
    }
}
