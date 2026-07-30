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
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'health_insurance_provider')) {
                $table->string('health_insurance_provider')->nullable()->after('esic_number');
                $table->string('health_insurance_policy_no')->nullable()->after('health_insurance_provider');
                $table->decimal('health_insurance_sum_insured', 12, 2)->nullable()->after('health_insurance_policy_no');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'health_insurance_provider')) {
                $table->dropColumn(['health_insurance_provider', 'health_insurance_policy_no', 'health_insurance_sum_insured']);
            }
        });
    }
};
