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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            
            // Base columns
            $table->string('employee_code')->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('client_branches')->cascadeOnDelete();
            $table->string('full_name');
            $table->string('personal_email');
            $table->string('phone_number');
            $table->date('date_of_birth');
            $table->date('date_of_joining');
            $table->string('designation');
            $table->enum('employment_model', ['eor', 'agency_contract']);
            $table->enum('status', ['active', 'onboarding', 'exited'])->default('onboarding');

            // Personal details
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('blood_group')->nullable();
            $table->enum('marital_status', ['single', 'married', 'other'])->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('residential_address')->nullable();
            $table->string('previous_employer_name')->nullable();
            $table->string('previous_employer_uan')->nullable();
            $table->string('aadhaar_number', 12)->nullable();
            $table->date('probation_end_date')->nullable();
            $table->foreignId('reporting_manager_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->boolean('prior_employment_flag')->default(false);
            $table->boolean('declarations_accepted')->default(false);

            // Salary - Single structure, 8 earnings
            $table->decimal('basic_pay', 10, 2);
            $table->decimal('hra', 10, 2);
            $table->decimal('conveyance', 10, 2);
            $table->decimal('da', 10, 2);
            $table->decimal('medical_allowance', 10, 2);
            $table->decimal('special_allowance', 10, 2);
            $table->decimal('other_additions', 10, 2)->default(0);

            // Computed summary fields
            $table->decimal('gross_monthly_salary', 10, 2);
            $table->decimal('net_take_home_monthly', 10, 2);
            $table->decimal('employer_pf_monthly', 10, 2);
            $table->decimal('employer_esi_monthly', 10, 2);
            $table->decimal('ctc_monthly', 10, 2);

            // Statutory toggles
            $table->boolean('pf_applicable')->default(true);
            $table->boolean('esi_applicable')->default(true);
            $table->date('esi_contribution_period_end')->nullable();
            $table->boolean('pt_applicable')->default(true);
            $table->decimal('pt_deduction_override', 8, 2)->nullable();
            $table->boolean('lwf_applicable')->default(true);
            $table->enum('tds_regime', ['old', 'new'])->default('new');
            $table->enum('gratuity_mode', ['part_of_ctc', 'over_and_above']);
            $table->boolean('bonus_toggle')->default(false);

            // Bank details
            $table->string('bank_account_number');
            $table->string('account_holder_name');
            $table->string('bank_ifsc');
            $table->string('bank_name');
            $table->string('bank_branch');
            $table->enum('uan_mode', ['new', 'existing_transfer']);
            $table->string('uan_number')->nullable();
            $table->string('esic_number')->nullable();
            $table->string('pan_number');

            // Exit-related
            $table->date('last_working_day')->nullable();
            $table->enum('exit_reason', ['resignation', 'termination', 'end_of_contract', 'absconding'])->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
