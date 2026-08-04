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
        Schema::table('bulk_upload_batches', function (Blueprint $table) {
            $table->string('type', 50)->default('employee')->index()->after('user_id');
            $table->foreignId('client_id')->nullable()->after('type')->constrained()->nullOnDelete();
            $table->date('target_month')->nullable()->after('client_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bulk_upload_batches', function (Blueprint $table) {
            $table->dropForeign(['client_id']);
            $table->dropColumn(['type', 'client_id', 'target_month']);
        });
    }
};
