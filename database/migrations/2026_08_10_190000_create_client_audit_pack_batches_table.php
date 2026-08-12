<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('client_audit_pack_batches')) {
            Schema::create('client_audit_pack_batches', function (Blueprint $table) {
                $table->id();
                $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
                $table->string('period', 7); // Y-m
                $table->integer('included_count')->default(0);
                $table->integer('missing_count')->default(0);
                $table->json('manifest')->nullable();
                $table->enum('status', ['generated', 'downloaded'])->default('generated');
                $table->string('file_path');
                $table->string('file_name');
                $table->string('file_hash', 64)->nullable();
                $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('downloaded_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['client_id', 'period']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('client_audit_pack_batches');
    }
};
