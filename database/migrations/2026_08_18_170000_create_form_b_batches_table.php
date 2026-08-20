<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_b_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('client_branches')->nullOnDelete();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->onDelete('restrict');
            $table->date('payroll_month');

            $table->unsignedInteger('employee_count')->default(0);

            // Total Emoluments Payable components
            $table->decimal('total_basic_wages', 14, 2)->default(0);
            $table->decimal('total_da', 14, 2)->default(0);
            $table->decimal('total_ot', 14, 2)->default(0);
            $table->decimal('total_bonus', 14, 2)->default(0);
            $table->decimal('total_other_wage_components', 14, 2)->default(0);
            $table->decimal('total_emoluments_payable', 14, 2)->default(0);

            // Deductions
            $table->decimal('total_fine', 14, 2)->default(0);
            $table->decimal('total_other_deductions', 14, 2)->default(0);
            $table->decimal('total_deductions', 14, 2)->default(0);

            // Payment
            $table->decimal('amount_actually_paid', 14, 2)->default(0);
            $table->decimal('balance_due', 14, 2)->default(0);

            $table->boolean('ot_data_available')->default(false);
            $table->boolean('bonus_data_available')->default(false);

            $table->string('pdf_file_path')->nullable();
            $table->string('pdf_file_name')->nullable();
            $table->string('xlsx_file_path')->nullable();
            $table->string('xlsx_file_name')->nullable();
            $table->string('csv_file_path')->nullable();
            $table->string('csv_file_name')->nullable();
            $table->string('file_hash', 64)->nullable();

            $table->string('status')->default('generated'); // generated | downloaded

            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('downloaded_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'payroll_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_b_batches');
    }
};
