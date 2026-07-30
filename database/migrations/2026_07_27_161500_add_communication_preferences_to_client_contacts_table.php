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
        Schema::table('client_contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('client_contacts', 'is_whatsapp_same')) {
                $table->boolean('is_whatsapp_same')->default(true);
            }
            if (!Schema::hasColumn('client_contacts', 'cc_on_invoice')) {
                $table->boolean('cc_on_invoice')->default(false);
            }
            if (!Schema::hasColumn('client_contacts', 'receive_onboarding_kits')) {
                $table->boolean('receive_onboarding_kits')->default(false);
            }
            if (!Schema::hasColumn('client_contacts', 'preference_email')) {
                $table->boolean('preference_email')->default(true);
            }
            if (!Schema::hasColumn('client_contacts', 'preference_sms')) {
                $table->boolean('preference_sms')->default(false);
            }
            if (!Schema::hasColumn('client_contacts', 'preference_whatsapp')) {
                $table->boolean('preference_whatsapp')->default(false);
            }
            if (!Schema::hasColumn('client_contacts', 'communication_preferences')) {
                $table->json('communication_preferences')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            $table->dropColumn([
                'is_whatsapp_same',
                'cc_on_invoice',
                'receive_onboarding_kits',
                'preference_email',
                'preference_sms',
                'preference_whatsapp',
                'communication_preferences',
            ]);
        });
    }
};
