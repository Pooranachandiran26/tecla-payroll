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
            $table->boolean('is_correction')->default(false)->after('salary_revision_applied');
            $table->string('correction_reason')->nullable()->after('is_correction');
            $table->foreignId('original_payroll_run_item_id')->nullable()->after('correction_reason')->constrained('payroll_run_items')->onDelete('set null');
            $table->foreignId('employee_query_id')->nullable()->after('original_payroll_run_item_id')->constrained('employee_queries')->onDelete('set null');
        });

        Schema::table('employee_queries', function (Blueprint $table) {
            $table->foreignId('correction_run_item_id')->nullable()->after('resolved_at')->constrained('payroll_run_items')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_queries', function (Blueprint $table) {
            $table->dropForeign(['correction_run_item_id']);
            $table->dropColumn('correction_run_item_id');
        });

        Schema::table('payroll_run_items', function (Blueprint $table) {
            $table->dropForeign(['original_payroll_run_item_id']);
            $table->dropForeign(['employee_query_id']);
            $table->dropColumn([
                'is_correction',
                'correction_reason',
                'original_payroll_run_item_id',
                'employee_query_id',
            ]);
        });
    }
};
