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
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');            // e.g. 'salary_revision', 'leave_request', 'bank_change', 'employee_query'
            $table->string('title');
            $table->text('body');
            $table->string('url')->nullable();
            // Nullable JSON column for structured payload (e.g. employee_id, client_id, revision_id)
            // Required to match AppNotification $casts['data' => 'array']
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Efficient querying: unread count per user, listing by user+recency
            $table->index(['user_id', 'read_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
