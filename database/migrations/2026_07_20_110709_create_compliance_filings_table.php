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
        Schema::create('compliance_filings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->enum('statute', ['pf', 'esi', 'pt', 'tds', 'clra']);
            $table->date('period'); // Represents the month/year of the filing, e.g., '2026-07-01'
            $table->enum('status', ['pending', 'filed'])->default('pending');
            $table->foreignId('filed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('filed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Prevent duplicate filings for the same statute and period for a client
            $table->unique(['client_id', 'statute', 'period'], 'compliance_unique_filing');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compliance_filings');
    }
};
