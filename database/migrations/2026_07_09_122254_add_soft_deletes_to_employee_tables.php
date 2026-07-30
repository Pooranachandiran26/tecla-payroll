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
        // Add suspended to status ENUM (skip for SQLite which doesn't support MODIFY COLUMN)
        if (\Illuminate\Support\Facades\DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE employees MODIFY COLUMN status ENUM('active','onboarding','exited','suspended') NOT NULL DEFAULT 'onboarding'");
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('employee_documents', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('salary_revisions', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('employee_exits', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('bank_change_requests', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('employee_documents', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('salary_revisions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('employee_exits', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('bank_change_requests', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        // Best effort revert of ENUM (if possible, though MySQL doesn't natively drop ENUM values easily without data loss risk,
        // so we'll just revert to the original if there are no 'suspended' records).
        // DB::statement("ALTER TABLE employees MODIFY COLUMN status ENUM('active','onboarding','exited') NOT NULL DEFAULT 'onboarding'");
    }
};
