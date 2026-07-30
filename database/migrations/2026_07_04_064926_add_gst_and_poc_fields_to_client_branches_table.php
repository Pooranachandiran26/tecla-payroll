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
        Schema::table('client_branches', function (Blueprint $table) {
            $table->string('gstin', 15)->nullable()->after('is_head_office');
            $table->string('gst_registration_type')->nullable()->after('gstin');
            $table->string('finance_poc_name')->nullable()->after('gst_registration_type');
            $table->string('finance_poc_email')->nullable()->after('finance_poc_name');
            $table->string('finance_poc_phone')->nullable()->after('finance_poc_email');
            $table->boolean('is_primary_billing_branch')->default(false)->after('finance_poc_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_branches', function (Blueprint $table) {
            $table->dropColumn([
                'gstin',
                'gst_registration_type',
                'finance_poc_name',
                'finance_poc_email',
                'finance_poc_phone',
                'is_primary_billing_branch'
            ]);
        });
    }
};
