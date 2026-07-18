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
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->date('payroll_month');
            $table->enum('status', ['draft', 'processing', 'approved', 'locked']);
            $table->unsignedInteger('total_employees_processed')->default(0);
            $table->unsignedInteger('total_employees_excluded')->default(0);
            $table->decimal('total_gross_earnings', 14, 2)->default(0);
            $table->decimal('total_net_disbursement', 14, 2)->default(0);
            $table->decimal('total_employer_statutory_cost', 14, 2)->default(0);
            $table->boolean('is_supplementary_run')->default(false);
            $table->foreignId('parent_run_id')->nullable()->constrained('payroll_runs')->onDelete('restrict');
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_runs');
    }
};
