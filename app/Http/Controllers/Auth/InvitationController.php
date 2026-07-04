<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Services\InvitationService;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class InvitationController extends Controller
{
    public function __construct(protected InvitationService $invitationService) {}

    public function show(string $token)
    {
        $user = User::where('invitation_token', hash('sha256', $token))
            ->where('status', 'invited')
            ->first();

        if (!$user) {
            return redirect('/login')->withErrors(['invitation' => 'Invalid invitation link.']);
        }

        if ($user->invitation_expires_at && $user->invitation_expires_at->isPast()) {
            return redirect('/login')->withErrors(['invitation' => 'Invitation link has expired.']);
        }

        return Inertia::render('Auth/AcceptInvitation', [
            'email' => $user->email,
            'role' => $user->role,
            'token' => $token
        ]);
    }

    public function complete(string $token, Request $request)
    {
        $request->validate([
            'password' => 'required|confirmed' // Add more rules using PasswordService if needed
        ]);

        try {
            $user = $this->invitationService->acceptInvitation($token, $request->password);
            Auth::login($user);
            $request->session()->regenerate();
            
            return redirect('/');
        } catch (\Exception $e) {
            return back()->withErrors(['invitation' => 'Failed to accept invitation. It may have expired.']);
        }
    }
}
