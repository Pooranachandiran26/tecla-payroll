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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->foreignId('branch_id')->constrained('client_branches')->onDelete('restrict');
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->onDelete('restrict');
            $table->date('invoice_month');
            $table->string('agency_gstin');
            $table->string('branch_gstin');
            $table->string('place_of_supply_state');
            $table->enum('gst_type', ['cgst_sgst', 'igst']);
            $table->decimal('gross_salary_passthrough', 14, 2);
            $table->decimal('agency_service_fee', 14, 2);
            $table->decimal('gst_amount', 14, 2);
            $table->decimal('grand_total', 14, 2);
            $table->enum('status', ['draft', 'raised', 'paid', 'overdue']);
            $table->date('due_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
