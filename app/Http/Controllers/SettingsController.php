<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    // ───────────────────────────────────────────────────
    //  Branding
    // ───────────────────────────────────────────────────

    public function getBranding()
    {
        $settings = SettingsService::group('branding');

        // Convert stored file paths to public URLs for the frontend
        foreach (['logo_path', 'favicon_path'] as $key) {
            if (!empty($settings[$key])) {
                $settings[$key . '_url'] = Storage::disk('public')->url($settings[$key]);
            } else {
                $settings[$key . '_url'] = '';
            }
        }

        return response()->json($settings);
    }

    public function updateBranding(Request $request)
    {
        $request->validate([
            'logo'               => 'nullable|image|mimes:jpg,jpeg,png,svg,webp|max:2048',
            'favicon'            => 'nullable|image|mimes:jpg,jpeg,png,svg,webp|max:2048',
            'primary_color'      => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'theme_mode_default' => 'nullable|string|in:light,dark,system',
        ]);

        $changes = [];

        // Handle logo upload
        if ($request->hasFile('logo')) {
            $oldPath = SettingsService::get('branding.logo_path');
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('logo')->store('branding', 'public');
            SettingsService::set('branding.logo_path', $path, auth()->id());
            $changes[] = ['key' => 'logo_path', 'old_value' => $oldPath, 'new_value' => $path];
        }

        // Handle favicon upload
        if ($request->hasFile('favicon')) {
            $oldPath = SettingsService::get('branding.favicon_path');
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('favicon')->store('branding', 'public');
            SettingsService::set('branding.favicon_path', $path, auth()->id());
            $changes[] = ['key' => 'favicon_path', 'old_value' => $oldPath, 'new_value' => $path];
        }

        // Handle text fields
        foreach (['primary_color', 'theme_mode_default'] as $field) {
            if ($request->has($field)) {
                $newValue = $request->input($field);
                $oldValue = SettingsService::get("branding.{$field}");
                if ($oldValue !== $newValue) {
                    SettingsService::set("branding.{$field}", $newValue, auth()->id());
                    $changes[] = ['key' => $field, 'old_value' => $oldValue, 'new_value' => $newValue];
                }
            }
        }

        if (!empty($changes)) {
            app(\App\Services\AuditService::class)->log('branding_updated', auth()->user(), null, null, ['changes' => $changes]);
        }

        return response()->json(['message' => 'Branding settings updated successfully.']);
    }
    public function getCompanyProfile()
    {
        $settings = SettingsService::group('company_profile');
        
        // Fix: decode any JSON-encoded strings that have baked-in literal quotes
        foreach ($settings as $key => $value) {
            if (is_string($value) && str_starts_with($value, '"') && str_ends_with($value, '"')) {
                $settings[$key] = json_decode($value);
            }
        }
        
        return response()->json($settings);
    }

    public function updateCompanyProfile(Request $request)
    {
        $updates = $request->validate([
            'agency_legal_name' => 'nullable|string',
            'tan_number' => 'nullable|string',
            'default_authorized_signatory' => 'nullable|string',
            'registered_office_address' => 'nullable|string',
            'agency_gstin' => 'nullable|string',
        ]);

        $changes = [];

        foreach ($updates as $key => $newValue) {
            $oldValue = SettingsService::get("company_profile.{$key}");
            
            if ($oldValue !== $newValue) {
                SettingsService::set("company_profile.{$key}", $newValue, auth()->id());
                
                $changes[] = [
                    'key' => $key,
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                ];
            }
        }

        if (!empty($changes)) {
            app(\App\Services\AuditService::class)->log('company_profile_updated', auth()->user(), null, null, ['changes' => $changes]);
        }

        return response()->json(['message' => 'Company Profile updated successfully.']);
    }

    public function getPtSlabs()
    {
        $slabs = \Illuminate\Support\Facades\DB::table('pt_slabs')->where('is_active', true)->get()->map(function ($slab) {
            return [
                'id' => $slab->id,
                'from' => '₹' . number_format($slab->min_salary),
                'to' => $slab->max_salary ? '₹' . number_format($slab->max_salary) : 'No Limit',
                'deduction' => '₹' . floatval($slab->deduction_amount) . ($slab->deduction_note ? ' ' . $slab->deduction_note : ''),
                'exceptions' => $slab->exceptions_text,
                'disabled' => true // Enforcing read-only on the frontend
            ];
        });
        
        return response()->json($slabs);
    }

    public function getAuthSecurity()
    {
        $settings = Setting::where('group', 'auth_security')->get()->keyBy('key');
        
        $response = $settings->map(function ($setting) {
            return [
                'value' => SettingsService::get("auth_security.{$setting->key}"),
                'is_locked' => $setting->is_locked,
                'type' => $setting->type
            ];
        });

        return response()->json($response);
    }

    public function getPayrollConfig()
    {
        $settings = SettingsService::group('payroll_configuration');
        return response()->json($settings);
    }

    public function updatePayrollConfig(Request $request)
    {
        $updates = $request->validate([
            'default_lop_basis' => 'required|in:26,30'
        ]);

        $changes = [];

        foreach ($updates as $key => $newValue) {
            $oldValue = SettingsService::get("payroll_configuration.{$key}");
            
            if ($oldValue !== $newValue) {
                SettingsService::set("payroll_configuration.{$key}", $newValue, auth()->id());
                
                $changes[] = [
                    'key' => $key,
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                ];
            }
        }

        if (!empty($changes)) {
            app(\App\Services\AuditService::class)->log('payroll_settings_updated', auth()->user(), null, null, ['changes' => $changes]);
        }

        return response()->json(['message' => 'Payroll configuration updated successfully.']);
    }

    public function updateAuthSecurity(Request $request)
    {
        $updates = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
            'settings.*.confirm_text' => 'nullable|string',
            'settings.*.reason' => 'nullable|string|min:10',
        ]);

        $permanentlyLocked = ['audit_logging_enabled', 'mask_sensitive_data_in_logs'];
        $changes = [];

        foreach ($updates['settings'] as $update) {
            $key = $update['key'];
            
            if (in_array($key, $permanentlyLocked)) {
                return response()->json(['error' => "Field {$key} is permanently locked and cannot be modified."], 403);
            }

            $setting = Setting::where('group', 'auth_security')->where('key', $key)->firstOrFail();
            $oldValue = SettingsService::get("auth_security.{$key}");
            
            // Note: In PHP, boolean 'false' from frontend JSON stays false, but let's compare casted values
            if ($oldValue === $update['value']) {
                continue; // No change
            }

            if ($setting->is_locked) {
                if (($update['confirm_text'] ?? '') !== 'CONFIRM') {
                    return response()->json(['error' => "Field {$key} is locked. You must provide confirm_text='CONFIRM'."], 422);
                }
                if (empty($update['reason']) || strlen($update['reason']) < 10) {
                    return response()->json(['error' => "Field {$key} is locked. You must provide a reason (min 10 chars)."], 422);
                }
            }

            SettingsService::set("auth_security.{$key}", $update['value'], auth()->id());

            $changes[] = [
                'key' => $key,
                'old_value' => $oldValue,
                'new_value' => $update['value'],
                'reason' => $update['reason'] ?? null,
            ];
        }

        if (!empty($changes)) {
            app(\App\Services\AuditService::class)->log('settings_updated', auth()->user(), null, null, ['changes' => $changes]);
        }

        return response()->json(['message' => 'Authentication settings updated successfully.']);
    }

    public function getEmailSettings()
    {
        $settings = SettingsService::group('email');
        
        $response = [];
        foreach ($settings as $key => $value) {
            if ($key === 'smtp_password') {
                $response[$key] = ''; // Never return the actual password
                $response['has_password'] = !empty($value);
            } else {
                $response[$key] = $value;
            }
        }
        
        return response()->json($response);
    }

    public function updateEmailSettings(Request $request)
    {
        $sandboxMode = filter_var($request->input('sandbox_mode', true), FILTER_VALIDATE_BOOLEAN);

        $rules = [
            'smtp_port' => 'nullable|integer|min:1|max:65535',
            'from_address' => 'nullable|email',
        ];

        if (!$sandboxMode) {
            $rules['smtp_host'] = 'required|string';
        }

        $request->validate($rules);

        $updates = $request->only([
            'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_encryption',
            'from_address', 'from_name', 'reply_to_address', 'sandbox_mode', 'otp_send_mode', 'invitation_send_mode'
        ]);

        $changes = [];

        foreach ($updates as $key => $newValue) {
            if ($key === 'smtp_password' && empty($newValue)) {
                continue; // Blank password means keep existing
            }

            $oldValue = SettingsService::get("email.{$key}");
            
            // Cast boolean properly for comparison
            if (is_bool($oldValue)) {
                $newValue = filter_var($newValue, FILTER_VALIDATE_BOOLEAN);
            }

            if ($oldValue !== $newValue) {
                SettingsService::set("email.{$key}", $newValue, auth()->id());
                
                $changes[] = [
                    'key' => $key,
                    'old_value' => $key === 'smtp_password' ? '[changed]' : $oldValue,
                    'new_value' => $key === 'smtp_password' ? '[changed]' : $newValue,
                ];
            }
        }

        if (!empty($changes)) {
            app(\App\Services\AuditService::class)->log('email.settings_updated', auth()->user(), null, null, ['changes' => $changes]);
            \Illuminate\Support\Facades\Artisan::call('queue:restart');
        }

        return response()->json(['message' => 'Email settings updated successfully.']);
    }

    public function testEmailSettings(Request $request)
    {
        $payload = $request->all();
        
        // If they provided a blank password, use the existing one from the DB
        if (empty($payload['smtp_password'])) {
            $payload['smtp_password'] = SettingsService::get('email.smtp_password');
        }

        config([
            'mail.mailers.smtp_test' => [
                'transport' => 'smtp',
                'host' => $payload['smtp_host'] ?? '',
                'port' => $payload['smtp_port'] ?? 587,
                'username' => $payload['smtp_username'] ?? '',
                'password' => $payload['smtp_password'] ?? '',
                'encryption' => empty($payload['smtp_encryption']) || $payload['smtp_encryption'] === 'none' ? null : $payload['smtp_encryption'],
            ],
            'mail.from.address' => $payload['from_address'] ?? 'test@example.com',
            'mail.from.name' => $payload['from_name'] ?? 'Test',
        ]);

        try {
            \Illuminate\Support\Facades\Mail::mailer('smtp_test')
                ->raw('This is a test email from Tecla Payroll.', function ($message) {
                    $message->to(auth()->user()->email)
                            ->subject('SMTP Connection Test');
                });
            
            app(\App\Services\AuditService::class)->log('email.test_sent', auth()->user());
            return response()->json(['message' => 'Test email sent successfully.']);
        } catch (\Exception $e) {
            app(\App\Services\AuditService::class)->log('email.test_failed', auth()->user(), null, null, ['error' => $e->getMessage()]);
            
            $errorMsg = $e->getMessage();
            $reason = 'unknown_error';
            
            if (str_contains(strtolower($errorMsg), 'connection refused') || str_contains(strtolower($errorMsg), 'connection timed out') || str_contains(strtolower($errorMsg), 'network is unreachable') || str_contains(strtolower($errorMsg), 'could not establish smtp connection')) {
                $reason = 'host_unreachable';
            } elseif (str_contains($errorMsg, '535 5.7.8') || str_contains(strtolower($errorMsg), 'authentication') || str_contains(strtolower($errorMsg), 'auth')) {
                $reason = 'auth_failed';
            } elseif (str_contains(strtolower($errorMsg), 'timeout') || str_contains(strtolower($errorMsg), 'time out')) {
                $reason = 'timeout';
            } elseif (str_contains($errorMsg, '553 5.1.8') || str_contains(strtolower($errorMsg), 'sender address rejected')) {
                $reason = 'invalid_from';
            }

            return response()->json(['error' => $reason, 'details' => $errorMsg], 422);
        }
    }
    // ───────────────────────────────────────────────────
    // Localization
    // ───────────────────────────────────────────────────

    public function getLocalization()
    {
        $settings = SettingsService::group('localization');
        return response()->json($settings);
    }

    public function updateLocalization(Request $request)
    {
        $validated = $request->validate([
            'timezone' => 'nullable|string|max:255',
            'date_format' => 'nullable|string|max:255',
            'currency_symbol' => 'nullable|string|max:10',
            'currency_code' => 'nullable|string|max:10',
            'financial_year_start_month' => 'nullable|integer|min:1|max:12',
        ]);

        foreach ($validated as $key => $value) {
            SettingsService::set('localization.' . $key, $value, auth()->id());
        }

        app(\App\Services\AuditService::class)->log('settings.localization_updated', auth()->user(), null, null, $validated);

        return response()->json(['message' => 'Localization settings updated successfully']);
    }
    // ───────────────────────────────────────────────────
    // File Upload Policy
    // ───────────────────────────────────────────────────

    public function getFileUploadPolicy()
    {
        $settings = SettingsService::group('file_upload_policy');
        return response()->json($settings);
    }

    public function updateFileUploadPolicy(Request $request)
    {
        $validated = $request->validate([
            'max_file_size_mb' => 'nullable|integer|min:1|max:100',
            'allowed_document_types' => 'nullable|array',
            'allowed_document_types.*' => 'string'
        ]);

        if (isset($validated['allowed_document_types'])) {
            $validated['allowed_document_types'] = json_encode($validated['allowed_document_types']);
        }

        foreach ($validated as $key => $value) {
            SettingsService::set('file_upload_policy.' . $key, $value, auth()->id());
        }

        app(\App\Services\AuditService::class)->log('settings.file_upload_policy_updated', auth()->user(), null, null, $validated);

        return response()->json(['message' => 'File Upload Policy updated successfully']);
    }
}
