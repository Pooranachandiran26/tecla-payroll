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
        Schema::table('payroll_run_items', function (Blueprint $table) {
            $table->decimal('employer_epf', 10, 2)->nullable()->default(null)->after('employer_pf');
            $table->decimal('employer_eps', 10, 2)->nullable()->default(null)->after('employer_epf');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_run_items', function (Blueprint $table) {
            $table->dropColumn(['employer_epf', 'employer_eps']);
        });
    }
};
