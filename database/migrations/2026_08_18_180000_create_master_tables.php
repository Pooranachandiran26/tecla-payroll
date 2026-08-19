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
        // 1. mas_industries
        if (!Schema::hasTable('mas_industries')) {
            Schema::create('mas_industries', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $industries = [
                ['name' => 'Information Technology (IT)', 'slug' => 'it', 'sort_order' => 1],
                ['name' => 'Banking, Financial Services & Insurance (BFSI)', 'slug' => 'bfsi', 'sort_order' => 2],
                ['name' => 'Manufacturing', 'slug' => 'manufacturing', 'sort_order' => 3],
                ['name' => 'Healthcare & Pharmaceuticals', 'slug' => 'healthcare', 'sort_order' => 4],
                ['name' => 'Retail & E-Commerce', 'slug' => 'retail', 'sort_order' => 5],
                ['name' => 'Real Estate & Construction', 'slug' => 'real_estate', 'sort_order' => 6],
                ['name' => 'Logistics & Supply Chain', 'slug' => 'logistics', 'sort_order' => 7],
                ['name' => 'Education & EdTech', 'slug' => 'education', 'sort_order' => 8],
                ['name' => 'Automobile', 'slug' => 'automobile', 'sort_order' => 9],
                ['name' => 'FMCG', 'slug' => 'fmcg', 'sort_order' => 10],
                ['name' => 'Telecom', 'slug' => 'telecom', 'sort_order' => 11],
                ['name' => 'Other', 'slug' => 'other', 'sort_order' => 12],
            ];
            foreach ($industries as $ind) {
                DB::table('mas_industries')->insert(array_merge($ind, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 2. mas_leave_types
        if (!Schema::hasTable('mas_leave_types')) {
            Schema::create('mas_leave_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->boolean('is_paid')->default(true);
                $table->decimal('default_accrual', 5, 2)->default(1.50);
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $leaveTypes = [
                ['name' => 'Earned Leave (EL)', 'code' => 'EL', 'is_paid' => true, 'default_accrual' => 1.50, 'sort_order' => 1],
                ['name' => 'Casual Leave (CL)', 'code' => 'CL', 'is_paid' => true, 'default_accrual' => 1.00, 'sort_order' => 2],
                ['name' => 'Sick Leave (SL)', 'code' => 'SL', 'is_paid' => true, 'default_accrual' => 0.50, 'sort_order' => 3],
                ['name' => 'Maternity Leave (ML)', 'code' => 'ML', 'is_paid' => true, 'default_accrual' => 0.00, 'sort_order' => 4],
                ['name' => 'Paternity Leave (PL)', 'code' => 'PL', 'is_paid' => true, 'default_accrual' => 0.00, 'sort_order' => 5],
                ['name' => 'Compensatory Off (Comp-Off)', 'code' => 'COMP_OFF', 'is_paid' => true, 'default_accrual' => 0.00, 'sort_order' => 6],
                ['name' => 'Loss of Pay (LOP)', 'code' => 'LOP', 'is_paid' => false, 'default_accrual' => 0.00, 'sort_order' => 7],
            ];
            foreach ($leaveTypes as $lt) {
                DB::table('mas_leave_types')->insert(array_merge($lt, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 3. mas_document_types
        if (!Schema::hasTable('mas_document_types')) {
            Schema::create('mas_document_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->enum('target_entity', ['client', 'employee', 'both'])->default('both');
                $table->string('icon')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $docTypes = [
                ['name' => 'Agent & Client Agreement', 'code' => 'agent_client_agreement', 'target_entity' => 'client', 'icon' => '🤝', 'sort_order' => 1],
                ['name' => 'Master Service Agreement (MSA)', 'code' => 'msa', 'target_entity' => 'client', 'icon' => '📜', 'sort_order' => 2],
                ['name' => 'Non-Disclosure Agreement (NDA)', 'code' => 'nda', 'target_entity' => 'client', 'icon' => '🔒', 'sort_order' => 3],
                ['name' => 'Work Order / SOW', 'code' => 'work_order', 'target_entity' => 'client', 'icon' => '📋', 'sort_order' => 4],
                ['name' => 'GST Registration Certificate', 'code' => 'gst_cert', 'target_entity' => 'client', 'icon' => '🏛️', 'sort_order' => 5],
                ['name' => 'PAN Card', 'code' => 'pan_card', 'target_entity' => 'both', 'icon' => '💳', 'sort_order' => 6],
                ['name' => 'TAN Allotment Letter', 'code' => 'tan_doc', 'target_entity' => 'client', 'icon' => '📄', 'sort_order' => 7],
                ['name' => 'Aadhaar Card', 'code' => 'aadhaar_card', 'target_entity' => 'employee', 'icon' => '🆔', 'sort_order' => 8],
                ['name' => 'Bank Passbook / Cancelled Cheque', 'code' => 'bank_proof', 'target_entity' => 'employee', 'icon' => '🏦', 'sort_order' => 9],
                ['name' => 'Relieving Letter / Service Certificate', 'code' => 'relieving_letter', 'target_entity' => 'employee', 'icon' => '📄', 'sort_order' => 10],
                ['name' => 'Educational Qualification Certificate', 'code' => 'degree_cert', 'target_entity' => 'employee', 'icon' => '🎓', 'sort_order' => 11],
                ['name' => 'Other Document', 'code' => 'other', 'target_entity' => 'both', 'icon' => '📎', 'sort_order' => 12],
            ];
            foreach ($docTypes as $dt) {
                DB::table('mas_document_types')->insert(array_merge($dt, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 4. mas_loan_types
        if (!Schema::hasTable('mas_loan_types')) {
            Schema::create('mas_loan_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $loanTypes = [
                ['name' => 'Salary Advance', 'code' => 'salary_advance', 'sort_order' => 1],
                ['name' => 'Travel Loan / Advance', 'code' => 'travel_loan', 'sort_order' => 2],
                ['name' => 'Personal Loan', 'code' => 'personal_loan', 'sort_order' => 3],
                ['name' => 'Emergency Medical Loan', 'code' => 'medical_loan', 'sort_order' => 4],
                ['name' => 'Laptop / Asset Purchase Loan', 'code' => 'asset_loan', 'sort_order' => 5],
                ['name' => 'Other Loan / Advance', 'code' => 'other', 'sort_order' => 6],
            ];
            foreach ($loanTypes as $lt) {
                DB::table('mas_loan_types')->insert(array_merge($lt, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 5. mas_exit_reasons (includes triggers_forfeiture_review boolean)
        if (!Schema::hasTable('mas_exit_reasons')) {
            Schema::create('mas_exit_reasons', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('exit_type_category'); // Resignation, Termination, End of Contract, Retirement, Client-Initiated
                $table->boolean('triggers_forfeiture_review')->default(false); // Sec 4(6) Payment of Gratuity Act
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $exitReasons = [
                // Resignation
                ['name' => 'Better Opportunity', 'exit_type_category' => 'Resignation', 'triggers_forfeiture_review' => false, 'sort_order' => 1],
                ['name' => 'Personal Reasons', 'exit_type_category' => 'Resignation', 'triggers_forfeiture_review' => false, 'sort_order' => 2],
                ['name' => 'Relocation', 'exit_type_category' => 'Resignation', 'triggers_forfeiture_review' => false, 'sort_order' => 3],
                ['name' => 'Higher Studies', 'exit_type_category' => 'Resignation', 'triggers_forfeiture_review' => false, 'sort_order' => 4],
                ['name' => 'Other Resignation Reason', 'exit_type_category' => 'Resignation', 'triggers_forfeiture_review' => false, 'sort_order' => 5],

                // Termination
                ['name' => 'Performance Below Expectations', 'exit_type_category' => 'Termination', 'triggers_forfeiture_review' => false, 'sort_order' => 6],
                ['name' => 'Conduct / Policy Violation', 'exit_type_category' => 'Termination', 'triggers_forfeiture_review' => true, 'sort_order' => 7],
                ['name' => 'Redundancy / Position Elimination', 'exit_type_category' => 'Termination', 'triggers_forfeiture_review' => false, 'sort_order' => 8],

                // End of Contract
                ['name' => 'Project Completed', 'exit_type_category' => 'End of Contract', 'triggers_forfeiture_review' => false, 'sort_order' => 9],
                ['name' => 'Fixed Term Expired', 'exit_type_category' => 'End of Contract', 'triggers_forfeiture_review' => false, 'sort_order' => 10],
                ['name' => 'Non-Renewal of Contract', 'exit_type_category' => 'End of Contract', 'triggers_forfeiture_review' => false, 'sort_order' => 11],

                // Retirement
                ['name' => 'Superannuation', 'exit_type_category' => 'Retirement', 'triggers_forfeiture_review' => false, 'sort_order' => 12],
                ['name' => 'Voluntary Retirement Scheme (VRS)', 'exit_type_category' => 'Retirement', 'triggers_forfeiture_review' => false, 'sort_order' => 13],
                ['name' => 'Health Reasons', 'exit_type_category' => 'Retirement', 'triggers_forfeiture_review' => false, 'sort_order' => 14],

                // Client-Initiated
                ['name' => 'Project Roll-off', 'exit_type_category' => 'Client-Initiated', 'triggers_forfeiture_review' => false, 'sort_order' => 15],
                ['name' => 'Cost Reduction by Client', 'exit_type_category' => 'Client-Initiated', 'triggers_forfeiture_review' => false, 'sort_order' => 16],
                ['name' => 'Replaced by Client', 'exit_type_category' => 'Client-Initiated', 'triggers_forfeiture_review' => false, 'sort_order' => 17],
            ];
            foreach ($exitReasons as $er) {
                DB::table('mas_exit_reasons')->insert(array_merge($er, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 6. mas_query_categories
        if (!Schema::hasTable('mas_query_categories')) {
            Schema::create('mas_query_categories', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $queryCategories = [
                ['name' => 'Payslip & Salary Query', 'code' => 'payslip', 'sort_order' => 1],
                ['name' => 'Income Tax / TDS & Declarations', 'code' => 'tax', 'sort_order' => 2],
                ['name' => 'PF & ESI Statutory Query', 'code' => 'pf_esi', 'sort_order' => 3],
                ['name' => 'Bank Account & Disbursement', 'code' => 'bank', 'sort_order' => 4],
                ['name' => 'Attendance & Leave Balance', 'code' => 'attendance', 'sort_order' => 5],
                ['name' => 'General / Other Query', 'code' => 'general', 'sort_order' => 6],
            ];
            foreach ($queryCategories as $qc) {
                DB::table('mas_query_categories')->insert(array_merge($qc, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 7. mas_clearance_items
        if (!Schema::hasTable('mas_clearance_items')) {
            Schema::create('mas_clearance_items', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('default_department');
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $clearanceItems = [
                ['name' => 'Asset Return (Laptop & Accessories)', 'default_department' => 'IT Support', 'sort_order' => 1],
                ['name' => 'Asset Return (ID Card / Access Card)', 'default_department' => 'Facility Security', 'sort_order' => 2],
                ['name' => 'Manager Sign-off & Handover Approval', 'default_department' => 'Reporting Manager', 'sort_order' => 3],
                ['name' => 'IT Access Revocation (Email, VPN, ERP)', 'default_department' => 'Cloud Infrastructure', 'sort_order' => 4],
                ['name' => 'Pending Task Handover & Documentation', 'default_department' => 'Project Lead', 'sort_order' => 5],
                ['name' => 'Client Notification Sent (Roll-off Formalized)', 'default_department' => 'Account Partner', 'sort_order' => 6],
            ];
            foreach ($clearanceItems as $ci) {
                DB::table('mas_clearance_items')->insert(array_merge($ci, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 8. mas_designations
        if (!Schema::hasTable('mas_designations')) {
            Schema::create('mas_designations', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('department_name')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $designations = [
                ['name' => 'Software Engineer', 'department_name' => 'Engineering', 'sort_order' => 1],
                ['name' => 'Senior Software Engineer', 'department_name' => 'Engineering', 'sort_order' => 2],
                ['name' => 'Tech Lead / Engineering Manager', 'department_name' => 'Engineering', 'sort_order' => 3],
                ['name' => 'Quality Assurance (QA) Engineer', 'department_name' => 'Quality Assurance', 'sort_order' => 4],
                ['name' => 'HR Executive / Recruiter', 'department_name' => 'Human Resources', 'sort_order' => 5],
                ['name' => 'HR Operations Manager', 'department_name' => 'Human Resources', 'sort_order' => 6],
                ['name' => 'Payroll & Compliance Specialist', 'department_name' => 'Finance & Payroll', 'sort_order' => 7],
                ['name' => 'Accountant / Finance Executive', 'department_name' => 'Finance & Payroll', 'sort_order' => 8],
                ['name' => 'Account Manager / Business Partner', 'department_name' => 'Operations', 'sort_order' => 9],
                ['name' => 'Executive Assistant / Admin Associate', 'department_name' => 'Administration', 'sort_order' => 10],
            ];
            foreach ($designations as $d) {
                DB::table('mas_designations')->insert(array_merge($d, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        // 9. mas_report_types
        if (!Schema::hasTable('mas_report_types')) {
            Schema::create('mas_report_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('category');
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            $reportTypes = [
                ['name' => 'Payroll Master Register', 'category' => 'Payroll', 'sort_order' => 1],
                ['name' => 'Headcount & Active Employee Summary', 'category' => 'Headcount', 'sort_order' => 2],
                ['name' => 'CTC Band & Salary Distribution', 'category' => 'Salary', 'sort_order' => 3],
                ['name' => 'PF ECR Returns Breakdown', 'category' => 'Statutory', 'sort_order' => 4],
                ['name' => 'ESIC Monthly Payout Statement', 'category' => 'Statutory', 'sort_order' => 5],
                ['name' => 'PT State Slabs Summary', 'category' => 'Statutory', 'sort_order' => 6],
                ['name' => 'TDS Deduction Audit Report', 'category' => 'Tax', 'sort_order' => 7],
                ['name' => 'Employee Attrition & Exit Audit', 'category' => 'HR Analytics', 'sort_order' => 8],
            ];
            foreach ($reportTypes as $rt) {
                DB::table('mas_report_types')->insert(array_merge($rt, ['created_at' => now(), 'updated_at' => now()]));
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mas_report_types');
        Schema::dropIfExists('mas_designations');
        Schema::dropIfExists('mas_clearance_items');
        Schema::dropIfExists('mas_query_categories');
        Schema::dropIfExists('mas_exit_reasons');
        Schema::dropIfExists('mas_loan_types');
        Schema::dropIfExists('mas_document_types');
        Schema::dropIfExists('mas_leave_types');
        Schema::dropIfExists('mas_industries');
    }
};
