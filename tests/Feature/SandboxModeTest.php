<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SandboxModeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_sandbox_mode_forces_array_mailer()
    {
        Setting::create(['group' => 'email', 'key' => 'sandbox_mode', 'value' => 'true', 'type' => 'boolean']);
        
        // Boot the provider via artisan config:clear or similar?
        // In feature tests, the app is already bootstrapped before DB seeding, so the ServiceProvider saw empty DB or old DB.
        // We can manually invoke the logic to test it.
        
        $provider = new \App\Providers\MailConfigServiceProvider($this->app);
        $provider->boot();

        $this->assertEquals('array', config('mail.default'));
    }

    public function test_production_mode_loads_smtp_settings()
    {
        Setting::create(['group' => 'email', 'key' => 'sandbox_mode', 'value' => 'false', 'type' => 'boolean']);
        Setting::create(['group' => 'email', 'key' => 'smtp_host', 'value' => 'smtp.test.com', 'type' => 'string']);
        Setting::create(['group' => 'email', 'key' => 'smtp_port', 'value' => '2525', 'type' => 'integer']);
        Setting::create(['group' => 'email', 'key' => 'from_address', 'value' => 'hello@test.com', 'type' => 'string']);
        
        $provider = new \App\Providers\MailConfigServiceProvider($this->app);
        $provider->boot();

        $this->assertEquals('smtp', config('mail.default'));
        $this->assertEquals('smtp.test.com', config('mail.mailers.smtp.host'));
        $this->assertEquals(2525, config('mail.mailers.smtp.port'));
        $this->assertEquals('hello@test.com', config('mail.from.address'));
    }
}
