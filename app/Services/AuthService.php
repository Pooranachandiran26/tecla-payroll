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

    public function isTestingMode(): bool
    {
        $val = $this->settings->getAuthSecurity('testing_mode_enabled', true);
        return $val === true || $val === 'true' || $val === 1 || $val === '1';
    }

    public function checkIpThrottle(string $ip): bool
    {
        if ($this->isTestingMode()) {
            return true;
        }

        $maxAttempts = (int) $this->settings->getAuthSecurity('ip_failed_attempts_threshold', 20);
        if ($maxAttempts <= 0) {
            return true;
        }

        $blockMinutes = (int) $this->settings->getAuthSecurity('ip_throttle_duration_minutes', 15);
        
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

        try {
            // Send synchronously inline to guarantee immediate delivery (< 5s) without waiting for queue workers
            \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\OtpMail($code, $user));
            $this->audit->log('otp.sent', $user, null, null, ['masked_email' => Str::mask($user->email, '*', 3)], null, $ip);
        } catch (\Throwable $e) {
            $this->audit->log('otp.send_failed', $user, null, null, ['error' => $e->getMessage()], null, $ip);
            throw new \App\Exceptions\OtpDeliveryException("We couldn't send your verification code. Please try again in a moment.");
        }
        
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

        if (!$this->isTestingMode()) {
            $maxAttempts = (int) $this->settings->getAuthSecurity('otp_max_attempts', 5);
            if ($maxAttempts > 0 && $otp->attempts >= $maxAttempts) {
                return false; // Code blocked due to too many attempts in strict production mode
            }
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
