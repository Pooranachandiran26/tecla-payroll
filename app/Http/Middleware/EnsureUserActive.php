<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Services\AuditService;

class EnsureUserActive
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            if ($user->isLocked()) {
                // Log the forced revocation
                app(AuditService::class)->log(
                    'session.force_revoked_due_to_status',
                    $user,
                    $user,
                    null,
                    null,
                    ['session_id' => $request->session()->getId(), 'ip_address' => $request->ip()]
                );
                
                // Rotate remember token
                $user->setRememberToken(Str::random(60));
                $user->save();
                
                // Logout and invalidate session
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                
                return redirect('/login')->withErrors(['email' => 'Account is locked. Please contact support.']);
            }
        }

        return $next($request);
    }
}
