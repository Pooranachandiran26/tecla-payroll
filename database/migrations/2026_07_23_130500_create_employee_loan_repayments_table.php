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
        Schema::create('employee_loan_repayments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_loan_id')->constrained('employee_loans')->onDelete('cascade');
            $table->foreignId('payroll_run_item_id')->constrained('payroll_run_items')->onDelete('cascade');
            $table->decimal('amount_deducted', 12, 2);
            $table->decimal('amount_deferred', 12, 2)->default(0.00);
            $table->date('payroll_month');
            $table->timestamps();

            $table->unique('payroll_run_item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_loan_repayments');
    }
};
