<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_leave_policies', function (Blueprint $table) {
            $table->decimal('max_days_per_month', 4, 2)->nullable()->default(null)->after('monthly_accrual_rate');
        });
    }

    public function down(): void
    {
        Schema::table('client_leave_policies', function (Blueprint $table) {
            $table->dropColumn('max_days_per_month');
        });
    }
};
