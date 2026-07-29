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
            if (!Schema::hasColumn('clients', 'payslip_visible_sections')) {
                $table->json('payslip_visible_sections')->nullable()->after('health_insurance_enabled');
            }
            if (!Schema::hasColumn('clients', 'payslip_template')) {
                $table->string('payslip_template')->default('standard')->after('health_insurance_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'payslip_visible_sections')) {
                $table->dropColumn('payslip_visible_sections');
            }
        });
    }
};
