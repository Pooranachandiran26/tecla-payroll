<?php

namespace App\Services;

use App\Models\User;
use App\Models\OtpCode;
use App\Models\LoginAttempt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class AuthService
{
    public function __construct(
        protected SettingsService $settings,
        protected AuditService $audit
    ) {}

    public function checkIpThrottle(string $ip): bool
    {
        if (!$this->settings->getAuthSecurity('ip_throttling_enabled', true)) {
            return true;
        }
        $maxAttempts = $this->settings->getAuthSecurity('max_failed_login_attempts_per_ip', 10);
        $blockMinutes = $this->settings->getAuthSecurity('ip_block_duration_minutes', 15);
        
        $attempt = LoginAttempt::firstOrCreate(['ip_address' => $ip]);
        if ($attempt->attempts >= $maxAttempts) {
            if ($attempt->last_attempt_at && $attempt->last_attempt_at->addMinutes($blockMinutes)->isFuture()) {
                return false;
            }
            // Block expired, reset
            $attempt->update(['attempts' => 0]);
        }
        return true;
    }

    public function recordFailedIpAttempt(string $ip)
    {
        $attempt = LoginAttempt::firstOrCreate(['ip_address' => $ip]);
        $attempt->increment('attempts');
        $attempt->update(['last_attempt_at' => now()]);
    }

    public function generateOtp(User $user, string $purpose, string $ip): void
    {
        $length = $this->settings->getAuthSecurity('otp_length', 6);
        $expiryMinutes = $this->settings->getAuthSecurity('otp_expiry_minutes', 10);
        
        // Generate random numeric code
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= mt_rand(0, 9);
        }

        // Save to DB
        $user->otpCodes()->create([
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes($expiryMinutes),
            'ip_address' => $ip
        ]);

        // "Send" email (using Log for now as requested)
        Log::info("OTP generated for {$user->email} (Purpose: $purpose): $code");
        
        $this->audit->log('otp_generated', $user, null, null, ['purpose' => $purpose], null, $ip);
    }

    public function verifyOtp(User $user, string $code, string $purpose, string $ip): bool
    {
        $otp = $user->otpCodes()
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otp) {
            $this->recordFailedIpAttempt($ip);
            return false;
        }

        $maxAttempts = $this->settings->getAuthSecurity('max_otp_attempts', 3);
        if ($otp->attempts >= $maxAttempts) {
            return false; // Code blocked due to too many attempts
        }

        $otp->increment('attempts');

        if (Hash::check($code, $otp->code_hash)) {
            $otp->update(['consumed_at' => now()]);
            return true;
        }

        $this->recordFailedIpAttempt($ip);
        return false;
    }
}
