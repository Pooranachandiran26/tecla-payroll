<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Services\AuthService;
use App\Services\SettingsService;

class LoginController extends Controller
{
    public function __construct(
        protected AuthService $authService,
        protected SettingsService $settings
    ) {}

    public function showLogin()
    {
        return Inertia::render('Auth/Login', [
            'rememberMeEnabled' => $this->settings->getAuthSecurity('remember_me_enabled', true)
        ]);
    }

    public function login(Request $request)
    {
        // Simple honeypot
        if ($request->filled('website_url')) {
            abort(403, 'Spam detected.');
        }

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $ip = $request->ip();

        if (!$this->authService->checkIpThrottle($ip)) {
            return back()->withErrors(['email' => 'Too many failed attempts. Please try again later.']);
        }

        $user = User::where('email', $request->email)->first();

        // Standard auth attempt
        if (!$user || !Auth::validate(['email' => $request->email, 'password' => $request->password])) {
            $this->authService->recordFailedIpAttempt($ip);
            if ($user) $user->incrementFailedAttempts();
            return back()->withErrors(['email' => 'Invalid email or password.']);
        }

        if ($user->isLocked()) {
            return back()->withErrors(['email' => 'Account is locked. Please contact support.']);
        }

        if ($this->settings->getAuthSecurity('otp_enabled', true)) {
            try {
                $this->authService->generateOtp($user, 'login', $ip);
                session([
                    'login_user_id' => $user->id,
                    'login_remember' => $request->boolean('remember')
                ]);
                return redirect('/login/verify-otp');
            } catch (\App\Exceptions\OtpDeliveryException $e) {
                return back()->withErrors(['email' => $e->getMessage()]);
            }
        }

        return $this->completeLogin($user, $request, $request->boolean('remember'));
    }

    public function showVerifyOtp()
    {
        if (!session('login_user_id')) {
            return redirect('/login');
        }
        return Inertia::render('Auth/VerifyOtp', [
            'otpLength' => $this->settings->getAuthSecurity('otp_length', 6),
            'cooldownMinutes' => $this->settings->getAuthSecurity('otp_cooldown_minutes', 2)
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $userId = session('login_user_id');
        if (!$userId) return redirect('/login');

        $user = User::find($userId);
        if (!$user) return redirect('/login');

        $request->validate(['code' => 'required|string']);

        if ($this->authService->verifyOtp($user, $request->code, 'login', $request->ip())) {
            $remember = session('login_remember', false);
            session()->forget(['login_user_id', 'login_remember']);
            return $this->completeLogin($user, $request, $remember);
        }

        return back()->withErrors(['code' => 'Invalid or expired code.']);
    }

    public function resendOtp(Request $request)
    {
        $userId = session('login_user_id');
        if (!$userId) return redirect('/login');

        $user = User::find($userId);
        if (!$user) return redirect('/login');

        try {
            $this->authService->generateOtp($user, 'login', $request->ip());
            return back()->with('message', 'A new code has been sent.');
        } catch (\App\Exceptions\OtpDeliveryException $e) {
            return back()->withErrors(['code' => $e->getMessage()]);
        }
    }

    protected function completeLogin(User $user, Request $request, bool $remember = false)
    {
        if (app()->environment('testing')) {
            logger('Remember flag passed to completeLogin: ' . ($remember ? 'true' : 'false'));
            logger('Session remember flag before verify: ' . session('login_remember'));
        }
        if (!$this->settings->getAuthSecurity('remember_me_enabled', true)) {
            $remember = false; // Override if disabled globally
        }
        
        Auth::login($user, $remember);
        $request->session()->regenerate();
        
        $user->resetFailedAttempts();
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        if ($this->settings->getAuthSecurity('prevent_concurrent_logins', true)) {
            \Illuminate\Support\Facades\DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', '!=', $request->session()->getId())
                ->delete();
        }
        app(\App\Services\AuditService::class)->log('login', $user);

        return redirect('/');
    }

    public function logout(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            app(\App\Services\AuditService::class)->log('logout', $user);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
