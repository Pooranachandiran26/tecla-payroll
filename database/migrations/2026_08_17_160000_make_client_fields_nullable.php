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
            if (Schema::hasColumn('clients', 'primary_poc_name')) {
                $table->string('primary_poc_name')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'primary_poc_email')) {
                $table->string('primary_poc_email')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'primary_poc_phone')) {
                $table->string('primary_poc_phone')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'registered_address_line_1')) {
                $table->string('registered_address_line_1')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'registered_city')) {
                $table->string('registered_city')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'registered_state')) {
                $table->string('registered_state')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'registered_pin')) {
                $table->string('registered_pin')->nullable()->change();
            }
            if (Schema::hasColumn('clients', 'contract_start_date')) {
                $table->date('contract_start_date')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Revert changes if needed
        });
    }
};
