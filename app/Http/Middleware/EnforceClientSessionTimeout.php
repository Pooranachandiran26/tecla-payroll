<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditService;

class EnforceClientSessionTimeout
{
    /**
     * Handle an incoming request for client dynamic session inactivity timeout.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->role === 'client' && $user->client) {
            // Ignore background polling requests so background pings never refresh user activity
            if ($request->hasHeader('X-Background-Poll') || $request->boolean('background_poll')) {
                return $next($request);
            }

            $timeoutMinutes = (int)($user->client->portal_session_timeout ?: config('session.lifetime', 120));

            if ($timeoutMinutes > 0) {
                $lastActivity = session('client_portal_last_activity');
                $nowTimestamp = now()->timestamp;

                if ($lastActivity !== null && ($nowTimestamp - (int)$lastActivity) >= ($timeoutMinutes * 60)) {
                    app(AuditService::class)->log('client_portal_session_timeout', $user, null, null, [
                        'client_id' => $user->client_id,
                        'timeout_minutes' => $timeoutMinutes,
                        'idle_seconds' => $nowTimestamp - (int)$lastActivity,
                    ]);

                    Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    $message = "Session expired due to inactivity ({$timeoutMinutes} mins). Please log in again.";

                    if ($request->expectsJson() || $request->inertia()) {
                        return redirect('/login')->withErrors(['email' => $message]);
                    }

                    return redirect('/login')->withErrors(['email' => $message]);
                }

                session(['client_portal_last_activity' => $nowTimestamp]);
            }
        }

        return $next($request);
    }
}
