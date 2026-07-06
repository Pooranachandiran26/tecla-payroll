<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Log;

class SettingsController extends Controller
{
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
}
