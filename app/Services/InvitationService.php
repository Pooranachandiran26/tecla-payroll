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

    public function createInvitation(array $userData, bool $forceQueue = false): User
    {
        $token = Str::random(64);
        $expiryDays = $this->settings->getAuthSecurity('invitation_expiry_days', 7);
        
        $user = User::create(array_merge($userData, [
            'status' => 'invited',
            'password' => Hash::make(Str::random(32)), // dummy password since users.password is not null
            'invitation_token' => hash('sha256', $token),
            'invitation_expires_at' => now()->addDays($expiryDays),
            'must_change_password' => true,
        ]));

        try {
            $link = url("/invitation/{$token}");
            if (!$forceQueue && \App\Services\SettingsService::get('email.invitation_send_mode') === 'sync') {
                \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\InvitationMail($link, $user));
            } else {
                \Illuminate\Support\Facades\Mail::to($user->email)->queue(new \App\Mail\InvitationMail($link, $user));
            }
            $this->audit->log('invitation_created', request()->user(), $user, null, ['email' => $user->email, 'role' => $user->role]);
        } catch (\Throwable $e) {
            $this->audit->log('invitation.send_failed', request()->user(), $user, null, ['error' => $e->getMessage()]);
            // Revert user creation since invitation failed
            $user->delete();
            throw new \App\Exceptions\InvitationDeliveryException("We couldn't send the invitation email. Please check your email configurations.");
        }

        return $user;
    }

    public function resendInvitation(User $user): void
    {
        if ($user->status !== 'invited') {
            throw new \Exception('Cannot resend invitation to an active user.');
        }

        $token = Str::random(64);
        $expiryDays = $this->settings->getAuthSecurity('invitation_expiry_days', 7);
        
        $user->update([
            'invitation_token' => hash('sha256', $token),
            'invitation_expires_at' => now()->addDays($expiryDays),
        ]);

        try {
            $link = url("/invitation/{$token}");
            if (\App\Services\SettingsService::get('email.invitation_send_mode') === 'sync') {
                \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\InvitationMail($link, $user));
            } else {
                \Illuminate\Support\Facades\Mail::to($user->email)->queue(new \App\Mail\InvitationMail($link, $user));
            }
            $this->audit->log('invitation_resent', request()->user(), $user, null, ['email' => $user->email, 'role' => $user->role]);
        } catch (\Throwable $e) {
            $this->audit->log('invitation.resend_failed', request()->user(), $user, null, ['error' => $e->getMessage()]);
            throw new \App\Exceptions\InvitationDeliveryException("We couldn't resend the invitation email. Please check your email configurations.");
        }
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
