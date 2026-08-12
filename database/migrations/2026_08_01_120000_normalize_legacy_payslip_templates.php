<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('clients')->where('payslip_template', 'standard_blue')->update(['payslip_template' => 'standard']);
        DB::table('clients')->where('payslip_template', 'modern_navy')->update(['payslip_template' => 'modern_dark']);
        DB::table('clients')->where('payslip_template', 'corporate_slate')->update(['payslip_template' => 'corporate']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op: Data normalization does not need to restore bad legacy strings.
    }
};
