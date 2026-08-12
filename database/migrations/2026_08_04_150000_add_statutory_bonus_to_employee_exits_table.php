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
            if (!Schema::hasColumn('employee_exits', 'statutory_bonus_amount')) {
                $table->decimal('statutory_bonus_amount', 10, 2)->default(0)->after('bonus_amount');
            }
            if (!Schema::hasColumn('employee_exits', 'statutory_bonus_eligible')) {
                $table->boolean('statutory_bonus_eligible')->default(false)->after('statutory_bonus_amount');
            }
            if (!Schema::hasColumn('employee_exits', 'gratuity_forfeiture_risk')) {
                $table->boolean('gratuity_forfeiture_risk')->default(false)->after('statutory_bonus_eligible');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_exits', function (Blueprint $table) {
            if (Schema::hasColumn('employee_exits', 'statutory_bonus_amount')) {
                $table->dropColumn(['statutory_bonus_amount', 'statutory_bonus_eligible', 'gratuity_forfeiture_risk']);
            }
        });
    }
};
