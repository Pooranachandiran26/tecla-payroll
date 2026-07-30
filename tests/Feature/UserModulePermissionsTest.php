<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class UserModulePermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_manager_custom_module_permissions(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false,
            'password_changed_at' => now(),
        ]);

        $manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'must_change_password' => false,
            'password_changed_at' => now(),
            'module_permissions' => null,
        ]);

        // Default hasModulePermission returns true
        $this->assertTrue($manager->hasModulePermission('payroll'));

        // Admin updates manager module permissions to only ['clients', 'employees']
        $response = $this->actingAs($admin)
            ->put(route('admin.users.update-module-permissions', $manager->id), [
                'module_permissions' => ['clients', 'candidates'],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('message');

        $manager->refresh();
        $this->assertEquals(['clients', 'candidates'], $manager->module_permissions);
        $this->assertTrue($manager->hasModulePermission('clients'));
        $this->assertTrue($manager->hasModulePermission('candidates'));
        $this->assertFalse($manager->hasModulePermission('payroll'));
        $this->assertFalse($manager->hasModulePermission('admin'));

        // Verify that manager without 'admin' module permission gets HTTP 403 Access Restricted when accessing /admin/activity-log
        $blockedResponse = $this->actingAs($manager)->get(route('admin.activity-log'));
        $blockedResponse->assertStatus(403);

        // Allow 'admin' permission and verify HTTP 200 Success
        $manager->update(['module_permissions' => ['clients', 'candidates', 'admin']]);
        $allowedResponse = $this->actingAs($manager)->get(route('admin.activity-log'));
        $allowedResponse->assertStatus(200);
    }
}
