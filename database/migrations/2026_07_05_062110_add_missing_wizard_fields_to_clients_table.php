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
            $table->string('tan_number')->nullable()->after('tax_id');
            $table->decimal('credit_limit', 12, 2)->default(0)->after('payment_net_terms');
            $table->decimal('late_payment_penalty_pct', 5, 2)->default(0)->after('credit_limit');
            $table->string('tds_applicable_on_agency_fee')->nullable()->after('currency');
            $table->decimal('pf_ceiling', 10, 2)->default(15000)->after('state_registration_option');
            $table->boolean('pf_applicable')->default(true)->after('pf_ceiling');
            $table->decimal('esi_limit', 10, 2)->default(21000)->after('pf_applicable');
            $table->boolean('esi_applicable')->default(true)->after('esi_limit');
            $table->string('lwf_frequency')->nullable()->after('esi_applicable');
            $table->boolean('lwf_applicable')->default(false)->after('lwf_frequency');
            $table->string('tds_regime')->nullable()->after('lwf_applicable');
            $table->boolean('tds_applicable')->default(true)->after('tds_regime');
            $table->boolean('gratuity_applicable')->default(true)->after('default_gratuity_mode');
            $table->boolean('portal_view_salary')->default(true)->after('portal_users_limit');
            $table->boolean('portal_view_invoices')->default(true)->after('portal_view_salary');
            $table->boolean('portal_view_payslips')->default(false)->after('portal_view_invoices');
            $table->boolean('portal_raise_requests')->default(true)->after('portal_view_payslips');
            $table->boolean('portal_require_2fa')->default(true)->after('portal_raise_requests');
            $table->integer('portal_session_timeout')->default(60)->after('portal_require_2fa');
            $table->string('portal_ip_whitelist')->nullable()->after('portal_session_timeout');
            $table->string('portal_primary_email')->nullable()->after('client_portal_enabled');
            $table->integer('custom_cycle_start_day')->default(1)->after('payroll_convention');
            $table->integer('custom_cycle_end_day')->default(28)->after('custom_cycle_start_day');
            $table->boolean('auto_reminders')->default(true)->after('custom_cycle_end_day');
            $table->text('client_notes')->nullable()->after('auto_reminders');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'tan_number', 'credit_limit', 'late_payment_penalty_pct', 'tds_applicable_on_agency_fee',
                'pf_ceiling', 'pf_applicable', 'esi_limit', 'esi_applicable',
                'lwf_frequency', 'lwf_applicable', 'tds_regime', 'tds_applicable',
                'gratuity_applicable', 'portal_view_salary', 'portal_view_invoices',
                'portal_view_payslips', 'portal_raise_requests', 'portal_require_2fa',
                'portal_session_timeout', 'portal_ip_whitelist', 'portal_primary_email',
                'custom_cycle_start_day', 'custom_cycle_end_day', 'auto_reminders', 'client_notes'
            ]);
        });
    }
};
