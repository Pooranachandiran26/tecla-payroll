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
        Schema::create('employee_tax_declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('financial_year', 9); // e.g. "2026-2027"
            $table->enum('regime', ['new', 'old'])->default('new');

            // 80C Investment components (Max 1.5 Lakhs combined limit)
            $table->decimal('ppf_amount', 10, 2)->default(0);
            $table->decimal('elss_amount', 10, 2)->default(0);
            $table->decimal('life_insurance_premium', 10, 2)->default(0);
            $table->decimal('tuition_fees', 10, 2)->default(0);
            $table->decimal('nsc_amount', 10, 2)->default(0);
            $table->decimal('housing_loan_principal', 10, 2)->default(0);
            $table->decimal('other_80c', 10, 2)->default(0);

            // 80D Health Insurance
            $table->decimal('health_insurance_self', 10, 2)->default(0);
            $table->decimal('health_insurance_parents', 10, 2)->default(0);
            $table->boolean('is_parents_senior')->default(false);

            // Section 24b Home Loan Interest
            $table->decimal('home_loan_interest_self', 10, 2)->default(0);

            // HRA Declaration Section 10(13A)
            $table->decimal('monthly_rent_paid', 10, 2)->default(0);
            $table->string('landlord_name')->nullable();
            $table->string('landlord_pan')->nullable();
            $table->text('landlord_address')->nullable();
            $table->boolean('is_metro_city')->default(false);

            // Other Chapter VI-A Deductions
            $table->decimal('section_80e_education_loan', 10, 2)->default(0);
            $table->decimal('section_80g_donations', 10, 2)->default(0);
            $table->decimal('other_exemptions', 10, 2)->default(0);

            // Previous Employer Details (Mid-year joiners)
            $table->decimal('previous_employer_gross', 12, 2)->default(0);
            $table->decimal('previous_employer_tds', 12, 2)->default(0);

            // Status & Verification Audit
            $table->enum('status', ['draft', 'submitted', 'verified', 'rejected'])->default('draft');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            // Ensure one declaration record per employee per financial year
            $table->unique(['employee_id', 'financial_year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_tax_declarations');
    }
};
