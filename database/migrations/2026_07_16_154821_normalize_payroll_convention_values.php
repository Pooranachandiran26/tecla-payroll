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
        Illuminate\Support\Facades\DB::table('clients')
            ->where('payroll_convention', 'calendar')
            ->update(['payroll_convention' => 'calendar_month']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Illuminate\Support\Facades\DB::table('clients')
            ->where('payroll_convention', 'calendar_month')
            ->update(['payroll_convention' => 'calendar']);
    }
};
