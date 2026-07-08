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
        Schema::create('employee_exits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            
            // Stage 1: Initiate
            $table->enum('exit_type', ['Resignation', 'Termination', 'End of Contract', 'Retirement', 'Client-Initiated'])->nullable();
            $table->string('reason_category')->nullable();
            $table->date('submission_date')->nullable();
            $table->boolean('discussed_with_employee')->default(false);
            $table->text('discussion_summary')->nullable();
            
            // Stage 2: Notice
            $table->date('last_working_day')->nullable();
            $table->integer('notice_shortfall_days')->default(0);
            $table->decimal('notice_amount', 10, 2)->default(0);
            $table->enum('notice_amount_type', ['addition', 'deduction', 'none'])->default('none');
            
            // Stage 3: Clearance
            $table->enum('clearance_laptop', ['yes', 'no', 'na'])->nullable();
            $table->enum('clearance_idcard', ['yes', 'no', 'na'])->nullable();
            $table->enum('clearance_manager', ['yes', 'no', 'na'])->nullable();
            $table->enum('clearance_itaccess', ['yes', 'no', 'na'])->nullable();
            $table->enum('clearance_handover', ['yes', 'no', 'na'])->nullable();
            $table->enum('clearance_client', ['yes', 'no', 'na'])->nullable();
            
            // Stage 4: Interview
            $table->text('interview_reason')->nullable();
            $table->enum('would_recommend', ['yes', 'no'])->nullable();
            $table->tinyInteger('star_rating')->nullable();
            
            // Stage 5: Settlement
            $table->decimal('pending_salary_amount', 10, 2)->default(0);
            $table->integer('unused_leaves')->default(0);
            $table->decimal('leave_encashment_amount', 10, 2)->default(0);
            $table->decimal('bonus_amount', 10, 2)->default(0);
            $table->decimal('gratuity_amount', 10, 2)->default(0);
            $table->decimal('loan_recovery_amount', 10, 2)->default(0);
            $table->decimal('tds_amount', 10, 2)->default(0);
            $table->json('adhoc_adjustments')->nullable();
            $table->decimal('net_settlement_amount', 12, 2)->default(0);
            
            // Stages 6 & 7: Confirmation & Status
            $table->enum('settlement_status', ['draft', 'pending_approval', 'approved'])->default('draft');
            $table->tinyInteger('current_stage')->default(1);
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_exits');
    }
};
