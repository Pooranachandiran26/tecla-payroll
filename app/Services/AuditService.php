<?php

namespace App\Services;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditService
{
    public function __construct(protected SettingsService $settings) {}

    public function log(
        string $action,
        ?User $user = null,
        ?Model $auditable = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
        ?string $ipAddress = null
    ): void {
        if (!$this->settings->getAuthSecurity('audit_logging_enabled', true)) {
            return;
        }

        if ($this->settings->getAuthSecurity('mask_sensitive_data_in_logs', true)) {
            $oldValues = $this->maskSensitive($oldValues);
            $newValues = $this->maskSensitive($newValues);
        }

        AuditLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id' => $auditable?->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => $ipAddress ?? request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    protected function maskSensitive(?array $data): ?array
    {
        if (!$data) return null;

        $sensitiveKeys = ['password', 'password_hash', 'code_hash', 'recovery_email', 'otp', 'token'];
        
        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys)) {
                $data[$key] = '********';
            }
        }
        return $data;
    }
}
