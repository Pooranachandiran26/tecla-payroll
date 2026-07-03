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
        Schema::create('salary_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            
            // Old salary components
            $table->decimal('old_basic_pay', 10, 2);
            $table->decimal('old_hra', 10, 2);
            $table->decimal('old_conveyance', 10, 2);
            $table->decimal('old_da', 10, 2);
            $table->decimal('old_medical_allowance', 10, 2);
            $table->decimal('old_special_allowance', 10, 2);
            $table->decimal('old_other_additions', 10, 2)->default(0);
            $table->decimal('old_net_take_home', 10, 2);
            $table->decimal('old_ctc', 10, 2);
            
            // New salary components
            $table->decimal('new_basic_pay', 10, 2);
            $table->decimal('new_hra', 10, 2);
            $table->decimal('new_conveyance', 10, 2);
            $table->decimal('new_da', 10, 2);
            $table->decimal('new_medical_allowance', 10, 2);
            $table->decimal('new_special_allowance', 10, 2);
            $table->decimal('new_other_additions', 10, 2)->default(0);
            $table->decimal('new_net_take_home', 10, 2);
            $table->decimal('new_ctc', 10, 2);
            
            // Metadata
            $table->date('effective_date');
            $table->string('reason_for_revision')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_revisions');
    }
};
