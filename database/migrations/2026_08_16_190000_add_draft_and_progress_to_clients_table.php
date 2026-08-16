<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify status column type to string or alter enum if using MySQL
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'onboarding_current_step')) {
                $table->unsignedSmallInteger('onboarding_current_step')->default(1)->after('status');
            }
            if (!Schema::hasColumn('clients', 'onboarding_completed_steps')) {
                $table->text('onboarding_completed_steps')->nullable()->after('onboarding_current_step');
            }
        });

        // Update status enum/column in MySQL DB to include 'draft'
        try {
            DB::statement("ALTER TABLE clients MODIFY COLUMN status ENUM('draft', 'onboarding', 'active', 'inactive', 'suspended') DEFAULT 'draft'");
        } catch (\Throwable $e) {
            // Fallback for SQLite/test DBs
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'onboarding_current_step')) {
                $table->dropColumn('onboarding_current_step');
            }
            if (Schema::hasColumn('clients', 'onboarding_completed_steps')) {
                $table->dropColumn('onboarding_completed_steps');
            }
        });

        try {
            DB::statement("ALTER TABLE clients MODIFY COLUMN status ENUM('onboarding', 'active', 'inactive', 'suspended') DEFAULT 'onboarding'");
        } catch (\Throwable $e) {
        }
    }
};
