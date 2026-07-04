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
}
