<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $settings = app(\App\Services\SettingsService::class);
        
        // Build branding props (with safe fallback for empty values)
        $logoPath = \App\Services\SettingsService::get('branding.logo_path', '');
        $faviconPath = \App\Services\SettingsService::get('branding.favicon_path', '');
        
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'must_change_password' => $request->user()->must_change_password,
                ] : null,
            ],
            'authConfig' => [
                'idle_timeout_minutes' => $settings->getAuthSecurity('idle_timeout_minutes', 15),
                'session_lifetime' => config('session.lifetime'),
            ],
            'branding' => [
                'logo_url' => $logoPath ? \Illuminate\Support\Facades\Storage::disk('public')->url($logoPath) . '?v=' . time() : '',
                'favicon_url' => $faviconPath ? \Illuminate\Support\Facades\Storage::disk('public')->url($faviconPath) . '?v=' . time() : '',
                'primary_color' => \App\Services\SettingsService::get('branding.primary_color', '#1e3a8a'),
                'theme_mode_default' => \App\Services\SettingsService::get('branding.theme_mode_default', 'system'),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
        ];
    }
}
