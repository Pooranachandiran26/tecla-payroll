<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Batch 3: Compliance & Supporting Data.
     */
    public function up(): void
    {
        // 1. attendance_upload_batches — already has uploaded_by; add created_by, updated_by, verified_by
        Schema::table('attendance_upload_batches', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_upload_batches', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('uploaded_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('attendance_upload_batches', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('attendance_upload_batches', 'verified_by')) {
                $table->foreignId('verified_by')->nullable()->after('updated_by')->constrained('users')->nullOnDelete();
            }
        });

        // 2. client_documents — already has uploaded_by, verified_by; add created_by, updated_by
        Schema::table('client_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('client_documents', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('verified_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('client_documents', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 3. pt_slabs — add created_by, updated_by
        Schema::table('pt_slabs', function (Blueprint $table) {
            if (!Schema::hasColumn('pt_slabs', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('is_active')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('pt_slabs', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 4. lwf_slabs — add created_by, updated_by
        Schema::table('lwf_slabs', function (Blueprint $table) {
            if (!Schema::hasColumn('lwf_slabs', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('is_active')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('lwf_slabs', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 5. bank_change_requests — already has processed_by; add created_by, updated_by
        Schema::table('bank_change_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('bank_change_requests', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('processed_at')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('bank_change_requests', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });

        // 6. employee_exits — already has confirmed_by; add created_by, updated_by
        Schema::table('employee_exits', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_exits', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('confirmed_by')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('employee_exits', 'updated_by')) {
                $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_upload_batches', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropForeign(['verified_by']);
            $table->dropColumn(['created_by', 'updated_by', 'verified_by']);
        });

        Schema::table('client_documents', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('pt_slabs', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('lwf_slabs', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('bank_change_requests', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });

        Schema::table('employee_exits', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['created_by', 'updated_by']);
        });
    }
};
