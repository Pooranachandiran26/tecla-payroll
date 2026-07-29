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
            ['group' => 'invoicing', 'key' => 'bank_name', 'type' => 'string', 'value' => json_encode('HDFC Bank'), 'is_locked' => false],
            ['group' => 'invoicing', 'key' => 'account_number', 'type' => 'string', 'value' => json_encode('50200012345678'), 'is_locked' => false],
            ['group' => 'invoicing', 'key' => 'ifsc_code', 'type' => 'string', 'value' => json_encode('HDFC0000240'), 'is_locked' => false],
            ['group' => 'invoicing', 'key' => 'branch_name', 'type' => 'string', 'value' => json_encode('Bandra East Branch, Mumbai'), 'is_locked' => false],
            ['group' => 'invoicing', 'key' => 'payment_instructions', 'type' => 'string', 'value' => json_encode('Please make payment via NEFT/RTGS to the specified bank account within due date.'), 'is_locked' => false],
            ['group' => 'invoicing', 'key' => 'terms_and_conditions', 'type' => 'string', 'value' => json_encode("1. Payment due within specified Net terms.\n2. 18% GST applicable on agency service & candidate fees.\n3. Invoice disputes must be raised within the dispute window."), 'is_locked' => false],
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
        DB::table('settings')->where('group', 'invoicing')->delete();
    }
};
