<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AuthSecuritySettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // a) OTP & Login
            ['key' => 'otp_enabled', 'value' => 'true', 'type' => 'boolean', 'is_locked' => true],
            ['key' => 'otp_length', 'value' => '6', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'otp_expiry_minutes', 'value' => '5', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'otp_max_attempts', 'value' => '5', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'otp_resend_cooldown_seconds', 'value' => '30', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'honeypot_enabled', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],

            // b) Lockout & Abuse Protection
            ['key' => 'max_failed_login_attempts', 'value' => '5', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'account_lockout_minutes', 'value' => '15', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'progressive_delay_enabled', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],
            ['key' => 'ip_failed_attempts_threshold', 'value' => '20', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'ip_throttle_window_minutes', 'value' => '15', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'ip_throttle_duration_minutes', 'value' => '15', 'type' => 'integer', 'is_locked' => false],

            // c) Password Policy
            ['key' => 'password_min_length', 'value' => '10', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'require_mixed_case', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],
            ['key' => 'require_numbers', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],
            ['key' => 'require_symbols', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],
            ['key' => 'check_have_i_been_pwned', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],
            ['key' => 'password_history_count', 'value' => '5', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'password_expiry_days', 'value' => '90', 'type' => 'integer', 'is_locked' => true],
            ['key' => 'password_expiry_warning_days', 'value' => '7', 'type' => 'integer', 'is_locked' => false],

            // d) Session Management
            ['key' => 'session_lifetime_minutes', 'value' => '120', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'idle_timeout_admin_manager_minutes', 'value' => '30', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'idle_timeout_client_employee_minutes', 'value' => '60', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'idle_warning_before_minutes', 'value' => '2', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'max_concurrent_sessions_per_user', 'value' => '0', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'login_anomaly_alerts_enabled', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],

            // e) Invitation & Onboarding Security
            ['key' => 'invitation_expiry_hours', 'value' => '48', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'invitation_completion_throttle_attempts', 'value' => '3', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'invitation_completion_throttle_minutes', 'value' => '10', 'type' => 'integer', 'is_locked' => false],
            ['key' => 'force_password_change_on_first_login', 'value' => 'true', 'type' => 'boolean', 'is_locked' => true],

            // f) Audit & Data Protection
            ['key' => 'audit_logging_enabled', 'value' => 'true', 'type' => 'boolean', 'is_locked' => true],
            ['key' => 'mask_sensitive_data_in_logs', 'value' => 'true', 'type' => 'boolean', 'is_locked' => true],
            ['key' => 'unmasked_export_requires_confirmation', 'value' => 'true', 'type' => 'boolean', 'is_locked' => false],
        ];

        foreach ($settings as $setting) {
            \App\Models\Setting::updateOrCreate(
                ['group' => 'auth_security', 'key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'type' => $setting['type'],
                    'is_locked' => $setting['is_locked']
                ]
            );
        }
    }
}
