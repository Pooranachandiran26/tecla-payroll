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
        Schema::create('attendance_correction_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('attendance_date');
            
            // Snapshots
            $table->timestamp('original_punch_in_time')->nullable();
            $table->timestamp('original_punch_out_time')->nullable();
            $table->string('original_status')->nullable();
            
            // Requested Changes
            $table->dateTime('requested_punch_in_time');
            $table->dateTime('requested_punch_out_time');
            
            // Reason
            $table->enum('reason_category', [
                'forgot_to_punch_out', 
                'forgot_to_punch_in', 
                'system_error', 
                'emergency_early_leave', 
                'other'
            ]);
            $table->text('reason_details');
            
            // Status and workflow
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->timestamps();
            
            // Note: Application layer enforces ONE PENDING request per (employee_id, attendance_date)
            // But doing a unique index with partial condition (status='pending') is DB specific.
            // SQLite doesn't natively support easy partial unique indexes in migrations out of the box without raw sql, 
            // so we rely on the application check as instructed.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_correction_requests');
    }
};
