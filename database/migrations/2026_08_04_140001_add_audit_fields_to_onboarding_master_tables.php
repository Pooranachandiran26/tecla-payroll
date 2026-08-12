<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Batch 1: Onboarding & Core Master Data.
     */
    public function up(): void
    {
        // 1. clients
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('account_manager_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('clients', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 2. client_branches
        Schema::table('client_branches', function (Blueprint $table) {
            if (!Schema::hasColumn('client_branches', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('is_head_office')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('client_branches', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 3. client_contacts
        Schema::table('client_contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('client_contacts', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('is_primary_contact')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('client_contacts', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 4. employees
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('employees', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('employees', 'entry_source')) {
                $table->enum('entry_source', ['manual', 'bulk_upload', 'api'])->default('manual')->after('updated_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('client_branches', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('client_contacts', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by', 'entry_source']);
        });
    }
};
