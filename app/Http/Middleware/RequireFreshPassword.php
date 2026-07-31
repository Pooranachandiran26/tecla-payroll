<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use App\Services\SettingsService;

class RequireFreshPassword
{
    public function __construct(protected SettingsService $settings) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return redirect('/login');
        }

        $user = Auth::user();
        
        // 1. Force password change check
        if ($user->must_change_password) {
            return redirect('/force-password-change');
        }

        // 2. Expiry check
        $expiryDays = $this->settings->getAuthSecurity('password_expiry_days', 90);
        if ($expiryDays > 0 && $user->password_changed_at) {
            if ($user->password_changed_at->addDays($expiryDays)->isPast()) {
                $user->update(['must_change_password' => true]);
                return redirect('/force-password-change');
            }
        }

        return $next($request);
    }
}
