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
        Schema::create('tds_24q_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('financial_year', 9); // e.g. 2026-2027
            $table->string('assessment_year', 9); // e.g. 2027-2028
            $table->enum('quarter', ['Q1', 'Q2', 'Q3', 'Q4']);
            $table->integer('employee_count')->default(0);
            $table->decimal('total_taxable_salary', 14, 2)->default(0.00);
            $table->decimal('total_tds_deducted', 14, 2)->default(0.00);
            $table->decimal('total_tax_deposited', 14, 2)->default(0.00);
            $table->enum('status', ['generated', 'downloaded', 'filed'])->default('generated');
            $table->string('txt_file_path');
            $table->string('txt_file_name');
            $table->string('xlsx_file_path')->nullable();
            $table->string('xlsx_file_name')->nullable();
            $table->string('file_hash', 64)->nullable();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('downloaded_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'financial_year', 'quarter']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tds_24q_batches');
    }
};
