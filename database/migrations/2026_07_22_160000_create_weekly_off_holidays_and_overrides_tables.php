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
        if (!Schema::hasColumn('clients', 'weekly_off_pattern')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->string('weekly_off_pattern', 100)->default('sat,sun')->after('lop_basis_days');
            });
        }

        if (!Schema::hasColumn('employees', 'weekly_off_pattern')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->string('weekly_off_pattern', 100)->nullable()->after('lop_basis_days');
            });
        }

        if (!Schema::hasTable('holidays')) {
            Schema::create('holidays', function (Blueprint $table) {
                $table->id();
                $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
                $table->date('holiday_date');
                $table->string('name', 255);
                $table->boolean('is_optional')->default(false);
                $table->timestamps();

                $table->unique(['client_id', 'holiday_date']);
            });
        }

        if (!Schema::hasTable('employee_attendance_overrides')) {
            Schema::create('employee_attendance_overrides', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
                $table->date('override_date');
                $table->enum('attendance_day_type', ['work_day', 'weekly_off', 'holiday', 'paid_leave']);
                $table->text('reason')->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected', 'withdrawn'])->default('pending');
                $table->date('swap_target_date')->nullable();
                $table->foreignId('requested_by')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('approved_at')->nullable();
                $table->string('rejection_reason', 255)->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'override_date', 'status'], 'emp_att_overrides_emp_date_status_idx');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_attendance_overrides');
        Schema::dropIfExists('holidays');

        if (Schema::hasColumn('employees', 'weekly_off_pattern')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropColumn('weekly_off_pattern');
            });
        }

        if (Schema::hasColumn('clients', 'weekly_off_pattern')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('weekly_off_pattern');
            });
        }
    }
};
