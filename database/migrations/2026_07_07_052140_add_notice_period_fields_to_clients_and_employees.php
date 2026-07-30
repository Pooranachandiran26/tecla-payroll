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
            $table->integer('default_notice_period_days')->default(30)->after('lop_basis_days');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->integer('notice_period_days')->default(30)->after('lop_basis_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('notice_period_days');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('default_notice_period_days');
        });
    }
};
