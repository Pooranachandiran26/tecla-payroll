<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->text('warning_notes')->nullable()->after('due_date');
            $table->date('dispute_window_expires_at')->nullable()->after('warning_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['warning_notes', 'dispute_window_expires_at']);
        });
    }
};
