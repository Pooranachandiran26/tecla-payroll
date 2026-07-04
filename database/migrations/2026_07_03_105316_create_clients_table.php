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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();

            // BASE FIELDS
            $table->string('company_name');
            $table->string('client_code')->unique();
            $table->string('industry')->nullable();
            $table->enum('contract_type', ['agency', 'eor', 'hybrid', 'consulting']);
            $table->date('contract_start_date');
            $table->date('contract_end_date')->nullable();
            $table->enum('billing_model', ['markup', 'fixed_per_candidate', 'fixed_per_month', 'lumpsum', 'hourly']);
            $table->decimal('markup_percentage', 5, 2)->nullable();
            $table->decimal('fixed_fee_amount', 12, 2)->nullable();
            $table->enum('lop_basis_days', ['26', '30', 'inherit'])->default('26');
            $table->enum('status', ['onboarding', 'active', 'inactive', 'suspended'])->default('onboarding');
            $table->string('primary_poc_name');
            $table->string('primary_poc_email');
            $table->string('primary_poc_phone');

            // Step 1: Identity
            $table->enum('company_type', ['pvt_ltd', 'pub_ltd', 'llp', 'opc', 'partnership', 'proprietorship', 'trust', 'govt']);
            $table->string('country')->default('India');
            $table->text('pan_number')->nullable();
            $table->string('tax_id')->nullable();
            $table->text('gstin')->nullable();
            $table->string('trust_registration_number')->nullable();
            $table->string('registration_number')->nullable();
            $table->string('cin_number')->nullable();
            $table->date('incorporation_date')->nullable();
            $table->string('website')->nullable();
            $table->string('logo_path')->nullable();

            // Step 2: Address
            $table->string('registered_address_line_1');
            $table->string('registered_address_line_2')->nullable();
            $table->string('registered_city');
            $table->string('registered_state');
            $table->string('registered_pin');

            // Step 4: Contract
            $table->string('ot_billing_rule')->nullable();
            $table->string('payment_net_terms')->nullable(); 
            $table->string('invoice_cycle')->nullable();
            $table->string('currency')->default('INR');
            $table->boolean('po_required')->default(false);
            $table->string('po_number')->nullable();
            $table->string('contract_document_path')->nullable();
            $table->boolean('auto_renewal')->default(false);
            $table->integer('notice_period_days')->default(30);

            // Step 5: Statutory
            $table->string('pt_state')->nullable();
            $table->string('state_registration_option')->nullable();
            $table->enum('default_gratuity_mode', ['ctc_included', 'over_ctc', 'na'])->default('ctc_included');
            $table->boolean('statutory_bonus_applicable')->default(false);
            $table->decimal('bonus_rate_percentage', 4, 2)->default(8.33);
            $table->string('clra_license_number')->nullable();
            $table->date('clra_license_expiry')->nullable();

            // Step 7: Portal Access
            $table->boolean('client_portal_enabled')->default(true);
            $table->enum('portal_access_level', ['full', 'view_only', 'approver'])->default('view_only');
            $table->integer('portal_users_limit')->default(3);

            // Step 8: SLA
            $table->enum('sla_tier', ['standard', 'premium', 'enterprise'])->default('standard');
            $table->string('cutoff_day')->nullable();
            $table->string('payroll_lock_day')->nullable();
            $table->string('salary_credit_day')->nullable();
            $table->string('invoice_raise_day')->nullable();
            $table->string('payroll_convention')->nullable();
            $table->foreignId('account_manager_id')->nullable()->constrained('users');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
