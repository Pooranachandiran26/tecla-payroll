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
            $table->decimal('po_value', 12, 2)->nullable()->after('po_number');
            $table->date('po_validity_date')->nullable()->after('po_value');
            $table->text('invoice_footer_notes')->nullable()->after('po_validity_date');
            $table->boolean('pref_format_pdf')->default(true)->after('invoice_footer_notes');
            $table->boolean('pref_format_xlsx')->default(false)->after('pref_format_pdf');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamp('first_sent_at')->nullable()->after('status');
            $table->timestamp('sent_at')->nullable()->after('first_sent_at');
            $table->unsignedInteger('send_count')->default(0)->after('sent_at');
            $table->foreignId('sent_by')->nullable()->after('send_count')->constrained('users')->nullOnDelete();
            $table->string('sent_to_email')->nullable()->after('sent_by');
            $table->string('delivery_status')->nullable()->after('sent_to_email');
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE invoices MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'draft'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'po_value',
                'po_validity_date',
                'invoice_footer_notes',
                'pref_format_pdf',
                'pref_format_xlsx',
            ]);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['sent_by']);
            $table->dropColumn([
                'first_sent_at',
                'sent_at',
                'send_count',
                'sent_by',
                'sent_to_email',
                'delivery_status',
            ]);
        });
    }
};
