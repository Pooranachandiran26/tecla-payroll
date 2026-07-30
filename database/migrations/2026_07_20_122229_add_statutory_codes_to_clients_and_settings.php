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
        Schema::table('clients', function (Blueprint $table) {
            $table->string('pf_establishment_code')->nullable();
            $table->string('esi_code_number')->nullable();
        });

        DB::table('settings')->insert([
            [
                'group' => 'company_profile',
                'key' => 'pf_establishment_code',
                'type' => 'string',
                'value' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'group' => 'company_profile',
                'key' => 'esi_code_number',
                'type' => 'string',
                'value' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')
            ->where('group', 'company_profile')
            ->whereIn('key', ['pf_establishment_code', 'esi_code_number'])
            ->delete();

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['pf_establishment_code', 'esi_code_number']);
        });
    }
};
