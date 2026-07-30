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
        Schema::table('bank_change_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('bank_change_requests', 'employee_id')) {
                $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('cascade');
            }
            if (!Schema::hasColumn('bank_change_requests', 'status')) {
                $table->string('status')->default('pending');
            }
            if (!Schema::hasColumn('bank_change_requests', 'new_bank_account_number')) {
                $table->string('new_bank_account_number')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'new_bank_ifsc')) {
                $table->string('new_bank_ifsc')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'new_bank_name')) {
                $table->string('new_bank_name')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'new_bank_branch')) {
                $table->string('new_bank_branch')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'new_account_holder_name')) {
                $table->string('new_account_holder_name')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'reason')) {
                $table->text('reason')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable();
            }
            if (!Schema::hasColumn('bank_change_requests', 'processed_by')) {
                $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('bank_change_requests', 'processed_at')) {
                $table->timestamp('processed_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bank_change_requests', function (Blueprint $table) {
            $table->dropForeign(['processed_by']);
            $table->dropColumn([
                'new_bank_name',
                'new_bank_branch',
                'new_account_holder_name',
                'reason',
                'rejection_reason',
                'processed_by',
                'processed_at'
            ]);
        });
    }
};
