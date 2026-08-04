<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_leave_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->string('leave_type'); // sick, casual, earned, maternity, paternity, unpaid
            $table->string('policy_name');
            $table->decimal('annual_quota', 5, 2)->default(12.00);
            $table->enum('accrual_frequency', ['monthly', 'annual_upfront', 'quarterly'])->default('monthly');
            $table->decimal('monthly_accrual_rate', 4, 2)->default(1.00);
            $table->boolean('carry_forward_allowed')->default(false);
            $table->decimal('max_carry_forward_days', 4, 2)->default(0.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['client_id', 'leave_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_leave_policies');
    }
};
