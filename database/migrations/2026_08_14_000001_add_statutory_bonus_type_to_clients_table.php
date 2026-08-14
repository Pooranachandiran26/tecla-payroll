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
        if (Schema::hasTable('clients') && !Schema::hasColumn('clients', 'statutory_bonus_type')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->string('statutory_bonus_type', 30)->default('ctc_accrual')->after('bonus_rate_percentage');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('clients') && Schema::hasColumn('clients', 'statutory_bonus_type')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('statutory_bonus_type');
            });
        }
    }
};
