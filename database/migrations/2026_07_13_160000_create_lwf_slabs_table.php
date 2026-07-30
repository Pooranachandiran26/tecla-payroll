<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('lwf_slabs', function (Blueprint $table) {
            $table->id();
            $table->string('state')->unique();
            $table->decimal('employee_contribution', 10, 2);
            $table->decimal('employer_contribution', 10, 2);
            $table->enum('frequency', ['monthly', 'half_yearly', 'yearly']);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed with real sourced government rates for active states
        DB::table('lwf_slabs')->insert([
            [
                'state' => 'Maharashtra',
                'employee_contribution' => 25.00,
                'employer_contribution' => 75.00,
                'frequency' => 'half_yearly',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Karnataka',
                'employee_contribution' => 50.00,
                'employer_contribution' => 100.00,
                'frequency' => 'yearly',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'state' => 'Tamil Nadu',
                'employee_contribution' => 20.00,
                'employer_contribution' => 40.00,
                'frequency' => 'yearly',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lwf_slabs');
    }
};
