<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;

class InvitationService
{
    public function __construct(
        protected SettingsService $settings,
        protected AuditService $audit,
        protected PasswordService $passwordService
    ) {}

    public function createInvitation(array $userData): User
    {
        $token = Str::random(64);
        $expiryDays = $this->settings->getAuthSecurity('invitation_expiry_days', 7);
        
        $user = User::create(array_merge($userData, [
            'status' => 'invited',
            'invitation_token' => hash('sha256', $token),
            'invitation_expires_at' => now()->addDays($expiryDays),
            'must_change_password' => true,
        ]));

        // Send email via Log
        Log::info("Invitation created for {$user->email}. Link: " . url("/invitation/{$token}"));
        
        $this->audit->log('invitation_created', request()->user(), $user, null, ['email' => $user->email, 'role' => $user->role]);

        return $user;
    }

    public function acceptInvitation(string $token, string $password): User
    {
        $user = User::where('invitation_token', hash('sha256', $token))
                    ->where('status', 'invited')
                    ->where('invitation_expires_at', '>', now())
                    ->firstOrFail();

        $hash = Hash::make($password);
        
        $user->update([
            'password' => $hash,
            'status' => 'active',
            'invitation_token' => null,
            'invitation_expires_at' => null,
            'password_changed_at' => now(),
            'must_change_password' => false,
            'email_verified_at' => now(), // Assume verified if they had the token from email
        ]);

        $this->passwordService->recordHistory($user, $hash);
        
        $this->audit->log('invitation_accepted', $user, $user);

        return $user;
    }
}
