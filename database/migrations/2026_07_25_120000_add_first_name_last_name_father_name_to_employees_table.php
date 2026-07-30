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
        
        Schema::table('employees', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('branch_id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('father_name')->nullable()->after('last_name');
            $table->string('full_name')->nullable()->change();
        });

        // Populate first_name and last_name from existing full_name entries
        $employees = DB::table('employees')->whereNotNull('full_name')->get();
        foreach ($employees as $emp) {
            $parts = explode(' ', trim($emp->full_name), 2);
            $firstName = $parts[0] ?? '';
            $lastName = $parts[1] ?? '';
            DB::table('employees')->where('id', $emp->id)->update([
                'first_name' => $emp->first_name ?: $firstName,
                'last_name' => $emp->last_name ?: $lastName,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'father_name']);
        });
    }
};
