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
        Schema::create('bulk_upload_staging_rows', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->index();
            $table->integer('row_no');
            $table->string('employee_code')->nullable()->index();
            $table->string('client_code')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('full_name')->nullable();
            $table->string('personal_email')->nullable()->index();
            $table->string('phone_number')->nullable()->index();
            $table->text('bank_account_number')->nullable();
            $table->string('bank_account_hash', 64)->nullable()->index();
            $table->text('pan_number')->nullable();
            $table->string('pan_number_hash', 64)->nullable()->index();
            $table->text('aadhaar_number')->nullable();
            $table->string('aadhaar_number_hash', 64)->nullable()->index();
            $table->json('raw_data')->nullable();
            $table->json('db_payload')->nullable();
            $table->string('status', 20)->default('ready')->index();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bulk_upload_staging_rows');
    }
};
