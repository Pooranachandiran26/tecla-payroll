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
        if (!Schema::hasTable('esi_monthly_batches')) {
            Schema::create('esi_monthly_batches', function (Blueprint $table) {
                $table->id();
                $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
                $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
                $table->string('esi_code_number', 100)->nullable();
                $table->date('wage_month');
                $table->integer('employee_count')->default(0);
                $table->decimal('total_wages', 14, 2)->default(0.00);

                $table->enum('status', ['generated', 'downloaded'])->default('generated');
                $table->string('file_path')->nullable();
                $table->string('file_name')->nullable();
                $table->string('file_hash', 64)->nullable();

                $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('downloaded_at')->nullable();

                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

                $table->timestamps();
                $table->softDeletes();

                $table->index(['client_id', 'wage_month']);
                $table->index(['payroll_run_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('esi_monthly_batches');
    }
};
