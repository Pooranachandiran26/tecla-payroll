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
                    'module_permissions' => $request->user()->module_permissions,
                ] : null,
            ],
            'authConfig' => [
                'idle_timeout_minutes' => $settings->getAuthSecurity('idle_timeout_minutes', 15),
                'session_lifetime' => config('session.lifetime'),
            ],
            'branding' => [
                'logo_url' => $logoPath ? '/storage/' . ltrim($logoPath, '/') . '?v=' . time() : '',
                'favicon_url' => $faviconPath ? '/storage/' . ltrim($faviconPath, '/') . '?v=' . time() : '',
                'primary_color' => \App\Services\SettingsService::get('branding.primary_color', '#1e3a8a'),
                'accent_gold_color' => \App\Services\SettingsService::get('branding.accent_gold_color', '#B8860B'),
                'accent_gold_hover_color' => \App\Services\SettingsService::get('branding.accent_gold_hover_color', '#9c7109'),
                'header_text_color' => \App\Services\SettingsService::get('branding.header_text_color', '#FFFFFF'),
                'agency_display_name' => \App\Services\SettingsService::get('branding.agency_display_name', 'Tecla Payroll'),
                'portal_tagline' => \App\Services\SettingsService::get('branding.portal_tagline', 'Enterprise Payroll & HR Portal'),
                'card_corner_radius' => \App\Services\SettingsService::get('branding.card_corner_radius', '8'),
                'table_density' => \App\Services\SettingsService::get('branding.table_density', 'comfortable'),
                'footer_copyright_text' => \App\Services\SettingsService::get('branding.footer_copyright_text', '© 2026 Tecla Payroll. All Rights Reserved.'),
                'enable_footer_notice' => \App\Services\SettingsService::get('branding.enable_footer_notice', '1') !== '0',
                'login_screen_style' => \App\Services\SettingsService::get('branding.login_screen_style', 'centered'),
                'login_welcome_message' => \App\Services\SettingsService::get('branding.login_welcome_message', 'Sign in to your account'),
                'navbar_style' => \App\Services\SettingsService::get('branding.navbar_style', 'solid'),
                'font_family' => \App\Services\SettingsService::get('branding.font_family', 'inter'),
                'container_layout_width' => \App\Services\SettingsService::get('branding.container_layout_width', 'standard'),
                'button_hover_effect' => \App\Services\SettingsService::get('branding.button_hover_effect', 'elevation'),
                'enable_hover_animations' => \App\Services\SettingsService::get('branding.enable_hover_animations', '1') !== '0',
                'login_card_position' => \App\Services\SettingsService::get('branding.login_card_position', 'centered'),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            // notificationCount: unread in-app notifications for Admin/Manager only (v1 scope boundary).
            // Employees and Clients intentionally receive 0 — they are excluded from in-app notifications.
            'notificationCount' => fn () => ($request->user() && in_array($request->user()->role, ['admin', 'manager']))
                ? \App\Models\AppNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count()
                : 0,
        ];
    }
}
