<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cookie;
use Tests\TestCase;
use App\Models\User;
use App\Models\Setting;
use App\Services\AuthService;
use Illuminate\Support\Facades\Auth;

class RememberMeTest extends TestCase
{
    use RefreshDatabase;

    public function test_remember_me_works_with_otp()
    {
        // Setup settings
        Setting::updateOrCreate(['group' => 'auth_security', 'key' => 'remember_me_enabled'], ['value' => true, 'type' => 'boolean']);
        Setting::updateOrCreate(['group' => 'auth_security', 'key' => 'otp_enabled'], ['value' => true, 'type' => 'boolean']);
        
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'remember_token' => null,
        ]);

        // 1. Post to login with remember = true
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
            'remember' => true,
        ]);

        // Should redirect to verify-otp
        $response->assertRedirect('/login/verify-otp');
        $this->assertNull($user->fresh()->remember_token, "Token should not be set yet");
        
        // Assert session has login_remember
        $response->assertSessionHas('login_remember', true);

        // 2. Mock OTP verification
        // Since the real generateOtp created a hashed code, let's inject a known one
        $user->otpCodes()->whereNull('consumed_at')->update(['consumed_at' => now()]); // invalidate generated
        
        $user->otpCodes()->create([
            'purpose' => 'login',
            'code_hash' => \Illuminate\Support\Facades\Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
            'ip_address' => '127.0.0.1'
        ]);
        
        // 3. Post to verify OTP
        $verifyResponse = $this->withSession([
            'login_user_id' => $user->id,
            'login_remember' => true
        ])->post('/login/verify-otp', [
            'code' => '123456',
        ]);

        $verifyResponse->assertRedirect('/');

        // 4. Assert remember token is set in DB
        $user->refresh();
        $this->assertNotNull($user->remember_token, "Remember token MUST be set after OTP verification");

        // 5. Assert remember cookie is present
        $verifyResponse->assertCookie(\Illuminate\Support\Facades\Auth::guard()->getRecallerName());
        
        echo "SUCCESS: remember_token successfully set after OTP: " . $user->remember_token . "\n";
    }

    public function test_remember_me_false_does_not_set_cookie()
    {
        Setting::updateOrCreate(['group' => 'auth_security', 'key' => 'remember_me_enabled'], ['value' => true, 'type' => 'boolean']);
        Setting::updateOrCreate(['group' => 'auth_security', 'key' => 'otp_enabled'], ['value' => false, 'type' => 'boolean']);
        
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'remember_token' => null,
        ]);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
            'remember' => false, // explicitly false
        ]);

        $response->assertRedirect('/'); // Successful login
        
        // Output cookies that were actually set
        $cookies = $response->headers->getCookies();
        echo "Cookies set during normal login (Remember Me disabled):\n";
        foreach ($cookies as $cookie) {
            echo " - Name: " . $cookie->getName() . "\n";
            echo "   Value: " . substr($cookie->getValue(), 0, 30) . "...\n";
            echo "   Expires: " . ($cookie->getExpiresTime() === 0 ? 'Session (0)' : date('Y-m-d H:i:s', $cookie->getExpiresTime())) . "\n";
        }

        // Assert remember token is still null in DB
        $user->refresh();
        $this->assertNull($user->remember_token, "Remember token should NOT be set in DB");
        
        // Assert no remember cookie was sent
        $response->assertCookieMissing(\Illuminate\Support\Facades\Auth::guard()->getRecallerName());
    }
}
