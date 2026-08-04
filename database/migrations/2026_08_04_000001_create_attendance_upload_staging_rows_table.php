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
        Schema::create('attendance_upload_staging_rows', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->index();
            $table->string('employee_code')->index();
            $table->string('full_name')->nullable();
            $table->decimal('days_present', 4, 2)->default(0.00);
            $table->decimal('days_lop', 4, 2)->default(0.00);
            $table->string('status', 30)->default('ready')->index(); // ready, error
            $table->text('error_message')->nullable();
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->json('db_payloads')->nullable(); // contains expanded daily attendance records payload
            $table->json('raw_data')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_upload_staging_rows');
    }
};
