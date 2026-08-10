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
        if (!Schema::hasTable('pf_ecr_batches')) {
            Schema::create('pf_ecr_batches', function (Blueprint $table) {
                $table->id();
                $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
                $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
                $table->string('pf_establishment_code', 100);
                $table->date('wage_month');
                $table->integer('employee_count')->default(0);
                
                // Aggregate financials
                $table->decimal('total_epf_wages', 12, 2)->default(0.00);
                $table->decimal('total_eps_wages', 12, 2)->default(0.00);
                $table->decimal('total_employee_epf', 12, 2)->default(0.00);
                $table->decimal('total_employer_epf', 12, 2)->default(0.00);
                $table->decimal('total_employer_eps', 12, 2)->default(0.00);
                $table->integer('total_ncp_days')->default(0);

                // Tracking and status lifecycle
                $table->enum('status', ['draft', 'validated', 'generated', 'downloaded', 'submitted', 'accepted', 'rejected', 'filed'])->default('generated');
                $table->string('file_path')->nullable();
                $table->string('file_name')->nullable();
                $table->string('file_hash', 64)->nullable();

                // Audit and reference tracking
                $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('downloaded_at')->nullable();
                
                // Filing payment details
                $table->string('trrn', 100)->nullable();
                $table->string('challan_number', 100)->nullable();
                $table->string('acknowledgement_ref', 100)->nullable();
                $table->text('rejection_reason')->nullable();
                $table->text('remarks')->nullable();

                // Standard Blameable audit fields
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                
                $table->timestamps();
                $table->softDeletes();

                $table->index(['client_id', 'wage_month']);
                $table->index(['payroll_run_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pf_ecr_batches');
    }
};
