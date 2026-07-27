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
        Schema::table('pt_slabs', function (Blueprint $table) {
            if (!Schema::hasColumn('pt_slabs', 'frequency')) {
                $table->string('frequency')->default('monthly')->after('deduction_note');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pt_slabs', function (Blueprint $table) {
            if (Schema::hasColumn('pt_slabs', 'frequency')) {
                $table->dropColumn('frequency');
            }
        });
    }
};
