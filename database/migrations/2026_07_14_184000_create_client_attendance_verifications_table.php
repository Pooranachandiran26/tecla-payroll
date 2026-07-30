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
        Schema::create('client_attendance_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->date('target_month'); // Stored as YYYY-MM-01
            $table->foreignId('verified_by')->constrained('users')->onDelete('restrict');
            $table->timestamp('verified_at');
            $table->timestamps();

            // Compound unique key to prevent duplicate verification entries for same client/month
            $table->unique(['client_id', 'target_month'], 'client_month_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_attendance_verifications');
    }
};
