<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * OT, Bonus and Fine are not tracked anywhere in TECLA. These columns previously
 * defaulted to 0.00, which is indistinguishable from a confirmed zero amount.
 * Making them nullable lets the application store NULL ("not tracked") separately
 * from 0.00 ("tracked and confirmed zero").
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_b_batches', function (Blueprint $table) {
            if (Schema::hasColumn('form_b_batches', 'total_ot')) {
                $table->decimal('total_ot', 14, 2)->nullable()->default(null)->change();
            }
            if (Schema::hasColumn('form_b_batches', 'total_bonus')) {
                $table->decimal('total_bonus', 14, 2)->nullable()->default(null)->change();
            }
            if (Schema::hasColumn('form_b_batches', 'total_fine')) {
                $table->decimal('total_fine', 14, 2)->nullable()->default(null)->change();
            }
        });

        // Existing rows that stored 0.00 as a stand-in for "not tracked" should become NULL.
        DB::table('form_b_batches')
            ->where('ot_data_available', false)
            ->update(['total_ot' => null]);
        DB::table('form_b_batches')
            ->where('bonus_data_available', false)
            ->update(['total_bonus' => null]);
        DB::table('form_b_batches')
            ->update(['total_fine' => null]); // fine is never tracked in TECLA today
    }

    public function down(): void
    {
        Schema::table('form_b_batches', function (Blueprint $table) {
            if (Schema::hasColumn('form_b_batches', 'total_ot')) {
                $table->decimal('total_ot', 14, 2)->nullable(false)->default(0)->change();
            }
            if (Schema::hasColumn('form_b_batches', 'total_bonus')) {
                $table->decimal('total_bonus', 14, 2)->nullable(false)->default(0)->change();
            }
            if (Schema::hasColumn('form_b_batches', 'total_fine')) {
                $table->decimal('total_fine', 14, 2)->nullable(false)->default(0)->change();
            }
        });
    }
};
