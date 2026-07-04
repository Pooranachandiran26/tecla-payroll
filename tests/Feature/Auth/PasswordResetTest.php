<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_reset_password_and_cannot_reuse_history()
    {
        $this->seed();
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => Hash::make('OldPassword123!')
        ]);

        // 1. Request reset OTP
        $this->post('/forgot-password', ['email' => 'reset@example.com'])
             ->assertRedirect('/reset-password/verify-otp')
             ->assertSessionHas('reset_email', 'reset@example.com');

        DB::table('otp_codes')
            ->where('user_id', $user->id)
            ->where('purpose', 'password_reset')
            ->update(['code_hash' => Hash::make('123456')]);
        
        $otp = '123456';

        // 2. Verify OTP
        $this->withSession(['reset_email' => 'reset@example.com'])
             ->post('/reset-password/verify-otp', ['code' => $otp])
             ->assertRedirect('/reset-password/new')
             ->assertSessionHas('reset_verified', true);

        // 3. Set new password
        $this->withSession(['reset_email' => 'reset@example.com', 'reset_verified' => true])
             ->post('/reset-password/new', [
                 'password' => 'NewStrongPass123!',
                 'password_confirmation' => 'NewStrongPass123!'
             ])
             ->assertRedirect('/login');

        // Confirm old password no longer works, but new one does
        $this->assertFalse(Hash::check('OldPassword123!', $user->fresh()->password));
        $this->assertTrue(Hash::check('NewStrongPass123!', $user->fresh()->password));

        // 4. Attempt to reuse history
        $this->withSession(['reset_email' => 'reset@example.com', 'reset_verified' => true])
             ->post('/reset-password/new', [
                 'password' => 'NewStrongPass123!',
                 'password_confirmation' => 'NewStrongPass123!'
             ])
             ->assertSessionHasErrors('password');
    }
}
