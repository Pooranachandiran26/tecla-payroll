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
        Schema::table('employees', function (Blueprint $table) {
            $table->enum('lop_basis_days', ['26', '30'])->default('26')->after('gratuity_mode');
            $table->boolean('tds_applicable')->default(true)->after('tds_regime');
            
            // Unique index for varchar fields
            $table->unique('personal_email');
            $table->unique('phone_number');

            // Blind index hash columns for encrypted fields
            $table->string('pan_number_hash')->nullable()->unique()->after('pan_number');
            $table->string('aadhaar_number_hash')->nullable()->unique()->after('aadhaar_number');
            $table->string('bank_account_hash')->nullable()->unique()->after('bank_account_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropUnique(['personal_email']);
            $table->dropUnique(['phone_number']);
            $table->dropUnique(['pan_number_hash']);
            $table->dropUnique(['aadhaar_number_hash']);
            $table->dropUnique(['bank_account_hash']);

            $table->dropColumn([
                'lop_basis_days',
                'tds_applicable',
                'pan_number_hash',
                'aadhaar_number_hash',
                'bank_account_hash',
            ]);
        });
    }
};
