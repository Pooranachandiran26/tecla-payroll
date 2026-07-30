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
            if (!Schema::hasColumn('clients', 'payslip_template')) {
                $table->string('payslip_template')->default('standard')->after('accent_color');
            }
        });

        Schema::table('payroll_runs', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_runs', 'resend_count')) {
                $table->integer('resend_count')->default(0)->after('payslip_released_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'payslip_template')) {
                $table->dropColumn('payslip_template');
            }
        });

        Schema::table('payroll_runs', function (Blueprint $table) {
            if (Schema::hasColumn('payroll_runs', 'resend_count')) {
                $table->dropColumn('resend_count');
            }
        });
    }
};
