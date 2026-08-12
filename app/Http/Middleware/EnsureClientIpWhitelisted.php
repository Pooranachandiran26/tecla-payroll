<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\IpUtils;
use Inertia\Inertia;

class EnsureClientIpWhitelisted
{
    /**
     * Handle an incoming request for client IP Whitelist verification.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->role === 'client' && $user->client) {
            $rawWhitelist = $user->client->portal_ip_whitelist;

            if (!empty($rawWhitelist)) {
                $whitelistedIps = array_filter(array_map('trim', preg_split('/[\r\n,]+/', $rawWhitelist)));

                if (!empty($whitelistedIps)) {
                    $requestIp = $request->ip();

                    if (!IpUtils::checkIp($requestIp, $whitelistedIps)) {
                        $message = "Access Denied: Your IP address ({$requestIp}) is not authorized for this Client Portal.";
                        
                        if ($request->expectsJson() || $request->inertia()) {
                            return Inertia::render('Error', [
                                'status' => 403,
                                'title' => '403 — IP Access Denied',
                                'message' => $message,
                            ])->toResponse($request)->setStatusCode(403);
                        }

                        abort(403, $message);
                    }
                }
            }
        }

        return $next($request);
    }
}
