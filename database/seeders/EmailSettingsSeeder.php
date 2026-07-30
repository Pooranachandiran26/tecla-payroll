<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class EmailSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'smtp_host', 'value' => '', 'type' => 'string'],
            ['key' => 'smtp_port', 'value' => '587', 'type' => 'integer'],
            ['key' => 'smtp_username', 'value' => '', 'type' => 'string'],
            // Value will be encrypted automatically by SettingsService::set() or uncastValue but here we insert manually so we must encrypt
            ['key' => 'smtp_password', 'value' => \Illuminate\Support\Facades\Crypt::encryptString(''), 'type' => 'encrypted'], 
            ['key' => 'smtp_encryption', 'value' => 'tls', 'type' => 'string'],
            ['key' => 'from_address', 'value' => '', 'type' => 'string'],
            ['key' => 'from_name', 'value' => 'Tecla Payroll', 'type' => 'string'],
            ['key' => 'reply_to_address', 'value' => '', 'type' => 'string'],
            // User requested check: branching on production environment for sandbox mode
            ['key' => 'sandbox_mode', 'value' => app()->environment('production') ? 'false' : 'true', 'type' => 'boolean'],
            ['key' => 'otp_send_mode', 'value' => 'sync', 'type' => 'string'],
            ['key' => 'invitation_send_mode', 'value' => 'queued', 'type' => 'string'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(
                ['group' => 'email', 'key' => $setting['key']],
                ['value' => $setting['value'], 'type' => $setting['type'], 'is_locked' => false]
            );
        }
    }
}
