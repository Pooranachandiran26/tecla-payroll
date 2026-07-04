<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Mail\InvitationMail;

class InvitationDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active', 'password_changed_at' => now()]);
        
        Setting::create(['group' => 'email', 'key' => 'invitation_send_mode', 'value' => 'queued', 'type' => 'string']);
        
        Cache::flush();
    }

    public function test_invitation_is_queued_by_default()
    {
        Mail::fake();

        $response = $this->actingAs($this->admin)->post('/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'role' => 'admin'
        ]);

        $response->assertSessionHas('message', 'User invited successfully.');
        
        Mail::assertQueued(InvitationMail::class, function ($mail) {
            return $mail->hasTo('newuser@example.com');
        });
    }

    public function test_invitation_is_sent_sync_when_configured()
    {
        Mail::fake();
        Setting::updateOrCreate(['group' => 'email', 'key' => 'invitation_send_mode'], ['value' => 'sync', 'type' => 'string']);
        Cache::flush();

        $response = $this->actingAs($this->admin)->post('/admin/users', [
            'name' => 'New User Sync',
            'email' => 'newsync@example.com',
            'role' => 'admin'
        ]);

        $response->assertSessionHas('message', 'User invited successfully.');
        
        Mail::assertSent(InvitationMail::class, function ($mail) {
            return $mail->hasTo('newsync@example.com');
        });
    }

    public function test_invitation_failure_is_caught_and_returns_error()
    {
        // Force mailer to throw an exception
        \Illuminate\Support\Facades\Config::set('mail.default', 'fail_mailer');
        \Illuminate\Support\Facades\Config::set('mail.mailers.fail_mailer', [
            'transport' => 'fail', 
        ]);
        
        Setting::updateOrCreate(['group' => 'email', 'key' => 'invitation_send_mode'], ['value' => 'sync', 'type' => 'string']);
        Cache::flush();

        $response = $this->actingAs($this->admin)->post('/admin/users', [
            'name' => 'Fail User',
            'email' => 'fail@example.com',
            'role' => 'admin'
        ]);

        $response->assertSessionHasErrors('email');
        
        // Assert user was not created
        $this->assertDatabaseMissing('users', [
            'email' => 'fail@example.com'
        ]);
    }
}
