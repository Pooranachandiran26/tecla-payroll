<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('esi_reason_codes')) {
            Schema::create('esi_reason_codes', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('code')->unique();
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('requires_zero_days')->default(true);
                $table->boolean('requires_last_working_day')->default(false);
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('esi_reason_codes');
    }
};
