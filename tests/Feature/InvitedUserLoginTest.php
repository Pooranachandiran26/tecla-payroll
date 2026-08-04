<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\InvitationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class InvitedUserLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_invited_user_password_hash_check_returns_false_safely()
    {
        $invitationService = app(InvitationService::class);
        $user = $invitationService->createInvitation([
            'name' => 'Invited Test User',
            'email' => 'invited_login_test@example.com',
            'role' => 'employee',
        ]);

        $this->assertEquals('invited', $user->status);
        $this->assertEquals(60, strlen($user->password));
        $this->assertStringStartsWith('$2y$04$', $user->password);

        // 1. Direct Hash::check test (must return FALSE cleanly, 0 exceptions)
        $checkResult = Hash::check('any_attempted_password_123', $user->password);
        $this->assertFalse($checkResult, "Hash::check must return FALSE cleanly for invited placeholder passwords.");

        // 2. Full HTTP Login endpoint test
        $response = $this->post('/login', [
            'email' => 'invited_login_test@example.com',
            'password' => 'some_secret_password',
        ]);

        // Must fail cleanly with invalid credentials validation error, 0 server exceptions
        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
