<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('esi_monthly_batches', 'zero_day_reasons')) {
            Schema::table('esi_monthly_batches', function (Blueprint $table) {
                $table->json('zero_day_reasons')->nullable()->after('total_wages');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('esi_monthly_batches', 'zero_day_reasons')) {
            Schema::table('esi_monthly_batches', function (Blueprint $table) {
                $table->dropColumn('zero_day_reasons');
            });
        }
    }
};
