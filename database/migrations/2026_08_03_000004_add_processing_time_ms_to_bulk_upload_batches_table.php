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
        if (Schema::hasTable('bulk_upload_batches') && !Schema::hasColumn('bulk_upload_batches', 'processing_time_ms')) {
            Schema::table('bulk_upload_batches', function (Blueprint $table) {
                $table->integer('processing_time_ms')->nullable()->after('error_message');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('bulk_upload_batches') && Schema::hasColumn('bulk_upload_batches', 'processing_time_ms')) {
            Schema::table('bulk_upload_batches', function (Blueprint $table) {
                $table->dropColumn('processing_time_ms');
            });
        }
    }
};
