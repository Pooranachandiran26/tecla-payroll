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
            $table->boolean('vpf_enabled')->default(false)->after('pf_applicable');
            $table->string('vpf_type', 20)->nullable()->after('vpf_enabled'); // 'percentage' or 'fixed_amount'
            $table->decimal('vpf_value', 12, 2)->nullable()->after('vpf_type');
        });

        Schema::table('payroll_run_items', function (Blueprint $table) {
            $table->decimal('employee_vpf', 12, 2)->default(0.00)->after('employee_pf');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['vpf_enabled', 'vpf_type', 'vpf_value']);
        });

        Schema::table('payroll_run_items', function (Blueprint $table) {
            $table->dropColumn(['employee_vpf']);
        });
    }
};
