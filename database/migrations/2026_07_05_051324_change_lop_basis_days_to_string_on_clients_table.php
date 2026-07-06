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
            $table->string('lop_basis_days', 50)->default('26')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // In a down method, if we try to revert to enum, it might lose data if there's 'calendar'. 
            // So leaving it as string is safer, but strictly speaking it was:
            $table->enum('lop_basis_days', ['26', '30', 'inherit'])->default('26')->change();
        });
    }
};
