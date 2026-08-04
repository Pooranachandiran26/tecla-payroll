<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_leave_policy_id')->constrained('client_leave_policies')->onDelete('cascade');
            $table->smallInteger('year');
            $table->decimal('allocated_days', 5, 2)->default(0.00);
            $table->decimal('carried_over_days', 5, 2)->default(0.00);
            $table->decimal('used_days', 5, 2)->default(0.00);
            $table->decimal('pending_days', 5, 2)->default(0.00);
            $table->decimal('remaining_days', 5, 2)->default(0.00);
            $table->decimal('snapshot_max_carry_forward_days', 4, 2)->default(0.00);
            $table->timestamps();

            $table->unique(['employee_id', 'client_leave_policy_id', 'year'], 'emp_policy_year_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_leave_balances');
    }
};
