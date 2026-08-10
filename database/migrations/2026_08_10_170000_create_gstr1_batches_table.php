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
        Schema::create('gstr1_batches', function (Blueprint $table) {
            $table->id();
            $table->string('return_period', 7); // YYYY-MM
            $table->integer('invoice_count')->default(0);
            $table->decimal('total_taxable_value', 14, 2)->default(0.00);
            $table->decimal('total_igst', 14, 2)->default(0.00);
            $table->decimal('total_cgst', 14, 2)->default(0.00);
            $table->decimal('total_sgst', 14, 2)->default(0.00);
            $table->decimal('total_tax_liability', 14, 2)->default(0.00);
            $table->enum('status', ['generated', 'downloaded', 'filed'])->default('generated');
            $table->string('json_file_path');
            $table->string('json_file_name');
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

            $table->index(['return_period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gstr1_batches');
    }
};
