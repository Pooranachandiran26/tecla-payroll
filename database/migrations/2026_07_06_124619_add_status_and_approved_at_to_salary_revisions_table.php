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
            $table->enum('status', ['pending_approval', 'approved', 'rejected'])->default('pending_approval')->after('reason_for_revision');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->string('rejection_reason')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_revisions', function (Blueprint $table) {
            $table->dropColumn(['status', 'approved_at', 'rejection_reason']);
        });
    }
};
