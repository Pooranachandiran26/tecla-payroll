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
            $table->boolean('is_disabled')->default(false)->after('gender')->index();
            $table->string('disability_type', 50)->nullable()->after('is_disabled');
            $table->unsignedTinyInteger('disability_percentage')->nullable()->after('disability_type');
            $table->string('udid_card_number', 50)->nullable()->after('disability_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'is_disabled',
                'disability_type',
                'disability_percentage',
                'udid_card_number',
            ]);
        });
    }
};
