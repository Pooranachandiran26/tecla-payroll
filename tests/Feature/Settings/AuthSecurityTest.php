<?php

namespace Tests\Feature\Settings;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_unlocked_auth_security_setting()
    {
        $this->seed();
        $adminUser = User::where('email', 'admin@tecla.in')->first();
        
        $response = $this->actingAs($adminUser)->put('/admin/settings/auth-security', [
            'settings' => [
                [
                    'key' => 'session_lifetime_minutes',
                    'value' => 240
                ]
            ]
        ]);
        
        $response->assertStatus(200);
        $this->assertDatabaseHas('settings', [
            'group' => 'auth_security',
            'key' => 'session_lifetime_minutes',
            'value' => '240'
        ]);

        $log = \Illuminate\Support\Facades\DB::table('audit_logs')
            ->where('action', 'settings_updated')
            ->orderBy('id', 'desc')
            ->first();
        echo "\n--- RAW DB QUERY FOR SETTINGS UPDATE AUDIT LOG (FROM REAL REQUEST) ---\n";
        echo json_encode($log, JSON_PRETTY_PRINT) . "\n";
    }
}
