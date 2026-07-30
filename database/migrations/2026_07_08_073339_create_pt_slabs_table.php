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
        Schema::create('pt_slabs', function (Blueprint $table) {
            $table->id();
            $table->string('state');
            $table->decimal('min_salary', 10, 2);
            $table->decimal('max_salary', 10, 2)->nullable(); // null means 'No Limit'
            $table->decimal('deduction_amount', 10, 2);
            $table->string('deduction_note')->nullable(); // e.g. '/ month'
            $table->string('exceptions_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pt_slabs');
    }
};
