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
        DB::table('clients')->where('lop_basis_days', 'inherit')->update(['lop_basis_days' => '30']);
        DB::table('clients')->where('lop_basis_days', '26_days')->update(['lop_basis_days' => '26']);
        DB::table('clients')->where('lop_basis_days', '30_days')->update(['lop_basis_days' => '30']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No safe down migration possible for data replacements.
    }
};
