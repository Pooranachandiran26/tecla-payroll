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
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'pf_member_id')) {
                $table->string('pf_member_id', 50)->nullable()->after('uan_number')->index();
            }
            if (!Schema::hasColumn('employees', 'member_relationship')) {
                $table->enum('member_relationship', ['F', 'S'])->default('F')->after('pf_member_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'pf_member_id')) {
                $table->dropColumn('pf_member_id');
            }
            if (Schema::hasColumn('employees', 'member_relationship')) {
                $table->dropColumn('member_relationship');
            }
        });
    }
};
