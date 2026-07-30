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
            $table->enum('markup_applied_on', ['gross_salary', 'ctc', 'basic_only', 'ctc_minus_statutory'])
                  ->default('gross_salary')
                  ->nullable()
                  ->after('markup_percentage');
            $table->decimal('client_tds_percentage', 5, 2)
                  ->nullable()
                  ->after('markup_applied_on');
            $table->decimal('hourly_rate', 10, 2)
                  ->nullable()
                  ->after('fixed_fee_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'markup_applied_on',
                'client_tds_percentage',
                'hourly_rate',
            ]);
        });
    }
};
