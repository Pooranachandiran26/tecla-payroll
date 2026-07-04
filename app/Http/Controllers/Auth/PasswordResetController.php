<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Services\AuthService;
use App\Services\PasswordService;
use Illuminate\Support\Facades\Hash;

class PasswordResetController extends Controller
{
    public function __construct(
        protected AuthService $authService,
        protected PasswordService $passwordService
    ) {}

    public function showForgotPassword()
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function sendResetOtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $user = User::where('email', $request->email)->first();

        if ($user) {
            $this->authService->generateOtp($user, 'password_reset', $request->ip());
            session(['reset_email' => $user->email]);
        }

        // Always return success to prevent email enumeration
        return redirect('/reset-password/verify-otp');
    }

    public function showVerifyResetOtp()
    {
        if (!session('reset_email')) return redirect('/forgot-password');
        
        return Inertia::render('Auth/VerifyResetOtp', [
            'email' => session('reset_email')
        ]);
    }

    public function verifyResetOtp(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $email = session('reset_email');
        if (!$email) return redirect('/forgot-password');

        $user = User::where('email', $email)->first();
        if (!$user || !$this->authService->verifyOtp($user, $request->code, 'password_reset', $request->ip())) {
            return back()->withErrors(['code' => 'Invalid or expired code.']);
        }

        session(['reset_verified' => true]);
        return redirect('/reset-password/new');
    }

    public function showNewPassword()
    {
        if (!session('reset_verified') || !session('reset_email')) {
            return redirect('/forgot-password');
        }

        return Inertia::render('Auth/ResetPassword');
    }

    public function resetPassword(Request $request)
    {
        if (!session('reset_verified') || !session('reset_email')) {
            return redirect('/forgot-password');
        }

        $request->validate([
            'password' => ['required', 'confirmed', $this->passwordService->buildValidationRules()]
        ]);

        $user = User::where('email', session('reset_email'))->firstOrFail();

        if (!$this->passwordService->checkHistory($user, $request->password)) {
            return back()->withErrors(['password' => 'Cannot reuse a recent password.']);
        }

        $hash = Hash::make($request->password);
        $user->update([
            'password' => $hash,
            'password_changed_at' => now(),
            'must_change_password' => false,
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'status' => 'active'
        ]);

        $this->passwordService->recordHistory($user, $hash);
        app(\App\Services\AuditService::class)->log('password_reset', $user);
        
        session()->forget(['reset_email', 'reset_verified']);

        return redirect('/login')->with('message', 'Password reset successfully.');
    }
}
