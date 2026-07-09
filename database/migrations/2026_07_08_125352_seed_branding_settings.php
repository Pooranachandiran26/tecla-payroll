<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();
        $rows = [
            ['group' => 'branding', 'key' => 'logo_path',          'value' => '', 'type' => 'string', 'is_locked' => false, 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'branding', 'key' => 'favicon_path',       'value' => '', 'type' => 'string', 'is_locked' => false, 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'branding', 'key' => 'primary_color',      'value' => '#1e3a8a', 'type' => 'string', 'is_locked' => false, 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'branding', 'key' => 'theme_mode_default', 'value' => 'system',  'type' => 'string', 'is_locked' => false, 'created_at' => $now, 'updated_at' => $now],
        ];

        foreach ($rows as $row) {
            DB::table('settings')->updateOrInsert(
                ['group' => $row['group'], 'key' => $row['key']],
                $row
            );
        }
    }

    public function down(): void
    {
        DB::table('settings')->where('group', 'branding')->delete();
    }
};
