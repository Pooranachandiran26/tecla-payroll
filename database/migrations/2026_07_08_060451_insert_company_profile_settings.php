<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $settings = [
            ['group' => 'company_profile', 'key' => 'agency_legal_name', 'type' => 'string', 'value' => json_encode('Tecla Agency Private Limited'), 'is_locked' => false],
            ['group' => 'company_profile', 'key' => 'tan_number', 'type' => 'string', 'value' => json_encode('MUMT01234B'), 'is_locked' => false],
            ['group' => 'company_profile', 'key' => 'default_authorized_signatory', 'type' => 'string', 'value' => json_encode('Rajesh Kumar'), 'is_locked' => false],
            ['group' => 'company_profile', 'key' => 'registered_office_address', 'type' => 'string', 'value' => json_encode('BKC, Bandra East, Mumbai, Maharashtra'), 'is_locked' => false],
            ['group' => 'company_profile', 'key' => 'agency_gstin', 'type' => 'string', 'value' => json_encode('27AABCM1234N1ZQ'), 'is_locked' => false],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['group' => $setting['group'], 'key' => $setting['key']],
                ['type' => $setting['type'], 'value' => $setting['value'], 'is_locked' => $setting['is_locked'], 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->where('group', 'company_profile')->delete();
    }
};
