<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Str;

class InvitationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_accept_valid_invitation_and_become_active()
    {
        $user = User::factory()->create([
            'status' => 'invited',
            'invitation_token' => hash('sha256', 'valid-token'),
            'invitation_expires_at' => now()->addDays(2),
        ]);

        $response = $this->post('/invitation/valid-token/complete', [
            'password' => 'NewStrongPass123!',
            'password_confirmation' => 'NewStrongPass123!',
        ]);

        $response->assertRedirect('/');
        
        $user->refresh();
        $this->assertEquals('active', $user->status);
        $this->assertNull($user->invitation_token);
    }

    public function test_user_cannot_accept_expired_invitation()
    {
        $user = User::factory()->create([
            'status' => 'invited',
            'invitation_token' => hash('sha256', 'expired-token'),
            'invitation_expires_at' => now()->subDays(1),
        ]);

        $response = $this->post('/invitation/expired-token/complete', [
            'password' => 'NewStrongPass123!',
            'password_confirmation' => 'NewStrongPass123!',
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors('invitation');
        $user->refresh();
        $this->assertEquals('invited', $user->status);
    }
}
