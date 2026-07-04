<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class OtpDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create(['role' => 'employee', 'status' => 'active', 'password_changed_at' => now()]);
        
        Setting::create(['group' => 'auth_security', 'key' => 'otp_enabled', 'value' => 'true', 'type' => 'boolean']);
        Setting::create(['group' => 'auth_security', 'key' => 'ip_throttling_enabled', 'value' => 'false', 'type' => 'boolean']);
        
        Setting::create(['group' => 'email', 'key' => 'otp_send_mode', 'value' => 'sync', 'type' => 'string']);
        
        Cache::flush();
    }

    public function test_otp_is_sent_synchronously()
    {
        Mail::fake();

        $response = $this->postJson('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(302);
        
        Mail::assertSent(OtpMail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });
    }

    public function test_otp_is_queued_when_mode_is_queued()
    {
        Mail::fake();
        Setting::updateOrCreate(['group' => 'email', 'key' => 'otp_send_mode'], ['value' => 'queued', 'type' => 'string']);
        Cache::flush();

        $response = $this->postJson('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(302);
        
        Mail::assertQueued(OtpMail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });
    }

    public function test_otp_delivery_failure_is_caught_and_returns_error()
    {
        // Force mailer to throw an exception
        \Illuminate\Support\Facades\Config::set('mail.default', 'fail_mailer');
        \Illuminate\Support\Facades\Config::set('mail.mailers.fail_mailer', [
            'transport' => 'fail', // invalid transport to trigger exception
        ]);

        $response = $this->post('/login', [
            'email' => $this->user->email,
            'password' => 'password',
        ]);

        // Expect to be redirected back with email error
        $response->assertSessionHasErrors('email');
        
        // Assert audit log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->user->id,
            'action' => 'otp.send_failed'
        ]);
    }
}
