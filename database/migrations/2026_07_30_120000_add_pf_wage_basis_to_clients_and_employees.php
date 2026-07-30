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
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'employee_pf_wage_basis')) {
                $table->enum('employee_pf_wage_basis', ['ceiling', 'actual_basic_da'])->default('ceiling')->after('pf_ceiling');
            }
            if (!Schema::hasColumn('clients', 'employer_pf_wage_basis')) {
                $table->enum('employer_pf_wage_basis', ['ceiling', 'actual_basic_da'])->default('ceiling')->after('employee_pf_wage_basis');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'joint_declaration_status')) {
                $table->enum('joint_declaration_status', ['not_required', 'pending', 'submitted', 'approved'])->default('not_required')->after('eps_applicable');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'employer_pf_wage_basis')) {
                $table->dropColumn('employer_pf_wage_basis');
            }
            if (Schema::hasColumn('clients', 'employee_pf_wage_basis')) {
                $table->dropColumn('employee_pf_wage_basis');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'joint_declaration_status')) {
                $table->dropColumn('joint_declaration_status');
            }
        });
    }
};
