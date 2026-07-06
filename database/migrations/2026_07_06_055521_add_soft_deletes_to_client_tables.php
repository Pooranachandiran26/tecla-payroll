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
        Schema::table('clients', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('client_branches', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('client_contacts', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('client_documents', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('client_branches', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('client_contacts', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('client_documents', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
