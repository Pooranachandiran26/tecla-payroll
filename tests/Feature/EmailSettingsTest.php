<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;

class EmailSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = clone User::factory()->create(['role' => 'admin', 'status' => 'active', 'password_changed_at' => now()]);
        
        Setting::create(['group' => 'email', 'key' => 'sandbox_mode', 'value' => 'true', 'type' => 'boolean']);
        Setting::create(['group' => 'email', 'key' => 'smtp_host', 'value' => 'smtp.mailtrap.io', 'type' => 'string']);
        Setting::create(['group' => 'email', 'key' => 'smtp_password', 'value' => 'secret123', 'type' => 'string']);
        
        Cache::flush();
    }

    public function test_get_email_settings_does_not_leak_password()
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/settings/email');
        
        $response->assertStatus(200);
        $response->assertJsonPath('smtp_password', '');
        $response->assertJsonPath('has_password', true);
        $response->assertJsonPath('sandbox_mode', true);
    }

    public function test_update_sandbox_mode_skips_host_requirement()
    {
        $response = $this->actingAs($this->admin)->putJson('/admin/settings/email', [
            'sandbox_mode' => true,
            'smtp_host' => '', // blank host should be allowed when sandbox is true
        ]);
        
        $response->assertStatus(200);
    }

    public function test_update_production_mode_requires_host()
    {
        $response = $this->actingAs($this->admin)->putJson('/admin/settings/email', [
            'sandbox_mode' => false,
            'smtp_host' => '', // blank host should fail
        ]);
        
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['smtp_host']);
    }

    public function test_updating_settings_queues_worker_restart()
    {
        Artisan::shouldReceive('call')->with('queue:restart')->once();

        $response = $this->actingAs($this->admin)->putJson('/admin/settings/email', [
            'sandbox_mode' => true,
            'smtp_host' => 'new.host.com',
            'confirmText' => 'CONFIRM',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('new.host.com', \App\Services\SettingsService::get('email.smtp_host'));
    }

    public function test_blank_password_on_update_keeps_existing()
    {
        $response = $this->actingAs($this->admin)->putJson('/admin/settings/email', [
            'sandbox_mode' => true,
            'smtp_password' => '', // should ignore
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals('secret123', \App\Services\SettingsService::get('email.smtp_password'));
    }
}
