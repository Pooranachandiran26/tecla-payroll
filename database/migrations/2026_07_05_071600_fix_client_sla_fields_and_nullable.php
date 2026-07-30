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
            $table->decimal('credit_limit', 12, 2)->nullable()->default(0)->change();
            $table->decimal('late_payment_penalty_pct', 5, 2)->nullable()->default(0)->change();
            if (!Schema::hasColumn('clients', 'invoice_dispute_window_days')) {
                $table->integer('invoice_dispute_window_days')->nullable()->after('salary_credit_day');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'invoice_dispute_window_days')) {
                $table->dropColumn('invoice_dispute_window_days');
            }
            // Note: Reverting nullable is generally unsafe, skipping.
        });
    }
};
