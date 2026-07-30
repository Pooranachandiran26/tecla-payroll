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
        Schema::create('payroll_run_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('restrict');
            $table->decimal('paid_days', 5, 2);
            $table->decimal('lop_days', 5, 2);
            
            // Earnings (Pro-rated)
            $table->decimal('basic_pay', 12, 2);
            $table->decimal('hra', 12, 2);
            $table->decimal('conveyance', 12, 2);
            $table->decimal('da', 12, 2);
            $table->decimal('medical_allowance', 12, 2);
            $table->decimal('special_allowance', 12, 2);
            $table->decimal('other_additions', 12, 2);
            
            $table->decimal('gross_total', 14, 2);
            
            // Deductions
            $table->decimal('employee_pf', 12, 2);
            $table->decimal('employee_esi', 12, 2);
            $table->decimal('professional_tax', 12, 2);
            $table->decimal('lwf_deduction', 12, 2);
            $table->decimal('lop_deduction', 12, 2);
            $table->decimal('tds_deduction', 12, 2);
            $table->decimal('loan_emi_deduction', 12, 2);
            
            $table->decimal('net_pay', 14, 2);
            
            // Employer share
            $table->decimal('employer_pf', 12, 2);
            $table->decimal('employer_esi', 12, 2);
            
            // Metadatas
            $table->boolean('is_excluded')->default(false);
            $table->string('exclusion_reason')->nullable();
            $table->enum('attendance_source', ['live_punch', 'uploaded', 'mixed']);
            $table->boolean('salary_revision_applied')->default(false);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_run_items');
    }
};
