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
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
            Schema::table('users', function (Blueprint $table) {
                // Drop existing non-unique foreign key and index if they exist
                $table->dropForeign(['employee_id']);
                // Add the unique constraint
                $table->unique('employee_id');
                // Re-add the foreign key constraint
                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['employee_id']);
                $table->dropUnique(['employee_id']);
                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
            });
        }
    }
};
