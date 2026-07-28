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
        Schema::table('salary_revisions', function (Blueprint $table) {
            $table->boolean('is_promotion')->default(false)->after('reason_for_revision');
            $table->string('old_designation')->nullable()->after('is_promotion');
            $table->string('new_designation')->nullable()->after('old_designation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_revisions', function (Blueprint $table) {
            $table->dropColumn(['is_promotion', 'old_designation', 'new_designation']);
        });
    }
};
