<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeclarativeMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_ensure_module_permission_middleware_independently_blocks_unauthorized_sub_permissions(): void
    {
        $manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
            'module_permissions' => ['candidates', 'emp_create'],
        ]);

        // 1. Direct GET request to /employees/bulk-upload (requires emp_bulk_upload)
        $responseForbidden = $this->actingAs($manager)->get('/employees/bulk-upload');

        // Verify that EnsureModulePermission middleware intercepts and blocks at HTTP kernel layer
        $responseForbidden->assertStatus(403);

        // 2. Direct GET request to /employees/create (requires emp_create, which IS granted)
        $responseAllowed = $this->actingAs($manager)->get('/employees/create');

        // Verify that authorized sub-permission proceeds successfully
        $responseAllowed->assertStatus(200);
    }
}
