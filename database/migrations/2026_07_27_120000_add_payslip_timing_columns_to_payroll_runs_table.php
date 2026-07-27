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
        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->timestamp('review_email_sent_at')->nullable()->after('locked_at');
            $table->timestamp('payslip_released_at')->nullable()->after('review_email_sent_at');
            $table->foreignId('payslip_released_by')->nullable()->after('payslip_released_at')->constrained('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->dropForeign(['payslip_released_by']);
            $table->dropColumn(['review_email_sent_at', 'payslip_released_at', 'payslip_released_by']);
        });
    }
};
