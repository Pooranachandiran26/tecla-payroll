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
        if (Schema::hasTable('payroll_run_items') && !Schema::hasColumn('payroll_run_items', 'statutory_bonus')) {
            Schema::table('payroll_run_items', function (Blueprint $table) {
                $table->decimal('statutory_bonus', 12, 2)->default(0.00)->after('other_additions');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('payroll_run_items') && Schema::hasColumn('payroll_run_items', 'statutory_bonus')) {
            Schema::table('payroll_run_items', function (Blueprint $table) {
                $table->dropColumn('statutory_bonus');
            });
        }
    }
};
