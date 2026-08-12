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
        Schema::create('tds_challans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tds_24q_batch_id')->nullable()->constrained('tds_24q_batches')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('financial_year', 9);
            $table->enum('quarter', ['Q1', 'Q2', 'Q3', 'Q4']);
            $table->string('bsr_code', 7);
            $table->date('deposit_date');
            $table->string('challan_serial_number', 5);
            $table->decimal('tax_amount', 12, 2);
            $table->decimal('surcharge', 12, 2)->default(0.00);
            $table->decimal('cess', 12, 2)->default(0.00);
            $table->decimal('interest', 12, 2)->default(0.00);
            $table->decimal('fee_234e', 12, 2)->default(0.00);
            $table->decimal('total_deposited', 12, 2);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['client_id', 'financial_year', 'quarter']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tds_challans');
    }
};
