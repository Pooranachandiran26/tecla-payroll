<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Batch 2: Financial Transaction Data.
     *
     * NOTE: These tables do NOT use the blanket BlameableTrait.
     * Their action-specific fields (sent_by, processed_by, approved_by, etc.)
     * are set ONLY inside explicit workflow methods, not on every save.
     */
    public function up(): void
    {
        // 1. invoices — already has sent_by; add created_by, updated_by, paid_by
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('payment_remarks')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('invoices', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('invoices', 'paid_by')) {
                $table->foreignId('paid_by')->nullable()->after('updated_by')->constrained('users')->nullOnDelete();
            }
        });

        // 2. payroll_runs — already has processed_by, approved_by; add created_by, updated_by, locked_by
        Schema::table('payroll_runs', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_runs', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('payslip_released_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('payroll_runs', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('payroll_runs', 'locked_by')) {
                $table->foreignId('locked_by')->nullable()->after('updated_by')->constrained('users')->nullOnDelete();
            }
        });

        // 3. payroll_run_items — add created_by, updated_by
        Schema::table('payroll_run_items', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_run_items', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('employee_query_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('payroll_run_items', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 4. salary_revisions — already has approved_by; add created_by, updated_by
        Schema::table('salary_revisions', function (Blueprint $table) {
            if (!Schema::hasColumn('salary_revisions', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('salary_revisions', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 5. employee_loans — already has approved_by; add created_by, updated_by
        Schema::table('employee_loans', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_loans', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('employee_loans', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropForeign(['paid_by']);
            $table->dropColumn(['created_by', 'updated_by', 'paid_by']);
        });

        Schema::table('payroll_runs', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropForeign(['locked_by']);
            $table->dropColumn(['created_by', 'updated_by', 'locked_by']);
        });

        Schema::table('payroll_run_items', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('salary_revisions', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('employee_loans', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });
    }
};
