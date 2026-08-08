<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class EnsureModulePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $moduleKey, ?string $subPermission = null): Response
    {
        if (!Auth::check()) {
            return redirect('/login');
        }

        $user = Auth::user();

        if ($user->role === 'admin' || $user->role === 'client') {
            return $next($request);
        }

        if (!$user->hasModulePermission($moduleKey)) {
            if ($request->expectsJson() || $request->inertia()) {
                abort(403, 'Access Restricted: You do not have permission to access the ' . ucfirst($moduleKey) . ' module.');
            }
            abort(403, 'Access Restricted');
        }

        if ($subPermission && !$user->hasModulePermission($subPermission, $moduleKey)) {
            if ($request->expectsJson() || $request->inertia()) {
                abort(403, 'Access Restricted: You do not have permission for sub-feature ' . $subPermission . '.');
            }
            abort(403, 'Access Restricted');
        }

        return $next($request);
    }
}
