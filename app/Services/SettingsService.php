<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    /**
     * Get a setting value.
     *
     * @param string $key Format: 'group.key'
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        $parts = explode('.', $key);
        if (count($parts) !== 2) {
            throw new \InvalidArgumentException("Settings key must be in the format 'group.key'");
        }

        [$group, $settingKey] = $parts;

        // Cache all settings for a group together to minimize DB queries
        $settings = Cache::rememberForever("settings.{$group}", function () use ($group) {
            return Setting::where('group', $group)->get()->keyBy('key');
        });

        if (!$settings->has($settingKey)) {
            return $default;
        }

        $setting = $settings->get($settingKey);

        return self::castValue($setting->value, $setting->type);
    }

    /**
     * Set a setting value.
     *
     * @param string $key Format: 'group.key'
     * @param mixed $value
     * @param int|null $updatedBy User ID
     * @return Setting
     */
    public static function set(string $key, $value, ?int $updatedBy = null)
    {
        $parts = explode('.', $key);
        if (count($parts) !== 2) {
            throw new \InvalidArgumentException("Settings key must be in the format 'group.key'");
        }

        [$group, $settingKey] = $parts;

        $setting = Setting::firstOrNew([
            'group' => $group,
            'key' => $settingKey,
        ]);
        
        if (!$setting->exists) {
            $setting->type = is_bool($value) || $value === 'true' || $value === 'false' ? 'boolean' : (is_int($value) ? 'integer' : 'string');
        }

        $setting->value = self::uncastValue($value, $setting->type);
        $setting->updated_by = $updatedBy;
        $setting->save();

        // Invalidate cache for this group
        Cache::forget("settings.{$group}");

        return $setting;
    }

    /**
     * Cast the raw DB string value to the correct PHP type.
     */
    private static function castValue($value, $type)
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $value,
            'json' => json_decode($value, true),
            'encrypted' => $value ? \Illuminate\Support\Facades\Crypt::decryptString($value) : '',
            default => (string) $value,
        };
    }

    /**
     * Convert PHP type to string for DB storage.
     */
    private static function uncastValue($value, $type)
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
            'json' => is_string($value) ? $value : json_encode($value),
            'encrypted' => $value ? \Illuminate\Support\Facades\Crypt::encryptString($value) : '',
            default => (string) $value,
        };
    }

    /**
     * Helper to get an auth_security setting.
     */
    public function getAuthSecurity(string $key, $default = null)
    {
        return static::get("auth_security.{$key}", $default);
    }

    /**
     * Get all settings for a specific group.
     */
    public static function group(string $group): array
    {
        $settings = Cache::rememberForever("settings.{$group}", function () use ($group) {
            return Setting::where('group', $group)->get()->keyBy('key');
        });

        $result = [];
        foreach ($settings as $key => $setting) {
            $result[$key] = self::castValue($setting->value, $setting->type);
        }

        return $result;
    }
}
