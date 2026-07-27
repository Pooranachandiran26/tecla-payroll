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
        Schema::table('employee_exits', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_exits', 'pt_shortfall_recovery')) {
                $table->decimal('pt_shortfall_recovery', 12, 2)->default(0.00)->after('tds_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_exits', function (Blueprint $table) {
            if (Schema::hasColumn('employee_exits', 'pt_shortfall_recovery')) {
                $table->dropColumn('pt_shortfall_recovery');
            }
        });
    }
};
