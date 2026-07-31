<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_change_password_with_valid_current_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123'),
        ]);

        $response = $this->actingAs($user)->postJson(route('account.password.update'), [
            'current_password' => 'OldPassword123',
            'password' => 'NewPassword456',
            'password_confirmation' => 'NewPassword456',
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $this->assertTrue(Hash::check('NewPassword456', $user->fresh()->password));
    }

    public function test_password_change_fails_with_invalid_current_password()
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword123'),
        ]);

        $response = $this->actingAs($user)->postJson(route('account.password.update'), [
            'current_password' => 'WrongPassword',
            'password' => 'NewPassword456',
            'password_confirmation' => 'NewPassword456',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['current_password']);
    }
}
