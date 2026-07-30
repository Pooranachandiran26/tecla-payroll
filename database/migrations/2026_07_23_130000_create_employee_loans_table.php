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
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('loan_number')->unique();
            $table->enum('loan_type', ['salary_advance', 'company_loan', 'external_garnishment'])->default('company_loan');
            $table->decimal('principal_amount', 12, 2);
            $table->decimal('monthly_emi', 12, 2);
            $table->decimal('total_repaid', 12, 2)->default(0.00);
            $table->decimal('remaining_balance', 12, 2);
            $table->date('start_date');
            $table->enum('status', ['active', 'completed', 'paused', 'cancelled'])->default('active');
            $table->text('reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_loans');
    }
};
