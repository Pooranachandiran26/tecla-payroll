<?php

namespace App\Services;

use App\Models\User;
use App\Models\PasswordHistory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordService
{
    public function __construct(protected SettingsService $settings) {}

    public function buildValidationRules(): Password
    {
        $rule = Password::min($this->settings->getAuthSecurity('password_min_length', 8));
        
        if ($this->settings->getAuthSecurity('password_require_mixed_case', true)) {
            $rule->mixedCase();
        }
        if ($this->settings->getAuthSecurity('password_require_numbers', true)) {
            $rule->numbers();
        }
        if ($this->settings->getAuthSecurity('password_require_symbols', true)) {
            $rule->symbols();
        }
        if ($this->settings->getAuthSecurity('password_prevent_pwned', true)) {
            $rule->uncompromised();
        }
        
        return $rule;
    }

    public function checkHistory(User $user, string $newPassword): bool
    {
        $preventReuseCount = $this->settings->getAuthSecurity('prevent_password_reuse_count', 3);
        if ($preventReuseCount <= 0) return true;

        $histories = $user->passwordHistories()->latest('created_at')->take($preventReuseCount)->get();

        foreach ($histories as $history) {
            if (Hash::check($newPassword, $history->password_hash)) {
                return false;
            }
        }

        return true;
    }

    public function recordHistory(User $user, string $passwordHash): void
    {
        $user->passwordHistories()->create([
            'password_hash' => $passwordHash,
            'created_at' => now(),
        ]);
        
        $preventReuseCount = $this->settings->getAuthSecurity('prevent_password_reuse_count', 3);
        
        // Cleanup old histories
        $keep = $user->passwordHistories()->latest('created_at')->take($preventReuseCount)->pluck('id');
        $user->passwordHistories()->whereNotIn('id', $keep)->delete();
    }
}
