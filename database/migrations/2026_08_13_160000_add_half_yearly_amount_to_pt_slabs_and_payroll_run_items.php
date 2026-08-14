<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add half_yearly_amount to pt_slabs
        Schema::table('pt_slabs', function (Blueprint $table) {
            if (!Schema::hasColumn('pt_slabs', 'half_yearly_amount')) {
                $table->decimal('half_yearly_amount', 10, 2)->nullable()->after('deduction_amount');
            }
        });

        // Populate clean statutory values for Tamil Nadu
        DB::table('pt_slabs')->where('state', 'Tamil Nadu')->where('min_salary', 0.00)->where('max_salary', 3500.00)->update(['half_yearly_amount' => 0.00]);
        DB::table('pt_slabs')->where('state', 'Tamil Nadu')->where('min_salary', 3501.00)->where('max_salary', 5000.00)->update(['half_yearly_amount' => 180.00]);
        DB::table('pt_slabs')->where('state', 'Tamil Nadu')->where('min_salary', 5001.00)->where('max_salary', 7500.00)->update(['half_yearly_amount' => 425.00]);
        DB::table('pt_slabs')->where('state', 'Tamil Nadu')->where('min_salary', 7501.00)->where('max_salary', 10000.00)->update(['half_yearly_amount' => 930.00]);
        DB::table('pt_slabs')->where('state', 'Tamil Nadu')->where('min_salary', 10001.00)->where('max_salary', 12500.00)->update(['half_yearly_amount' => 1025.00]);
        DB::table('pt_slabs')->where('state', 'Tamil Nadu')->where('min_salary', 12501.00)->update(['half_yearly_amount' => 1250.00]);

        // 2. Add pt_shortfall_recovery to payroll_run_items
        Schema::table('payroll_run_items', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_run_items', 'pt_shortfall_recovery')) {
                $table->decimal('pt_shortfall_recovery', 12, 2)->default(0.00)->after('professional_tax');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_run_items', function (Blueprint $table) {
            if (Schema::hasColumn('payroll_run_items', 'pt_shortfall_recovery')) {
                $table->dropColumn('pt_shortfall_recovery');
            }
        });

        Schema::table('pt_slabs', function (Blueprint $table) {
            if (Schema::hasColumn('pt_slabs', 'half_yearly_amount')) {
                $table->dropColumn('half_yearly_amount');
            }
        });
    }
};
