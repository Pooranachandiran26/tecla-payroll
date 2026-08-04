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
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('due_date');
            $table->decimal('paid_amount', 12, 2)->default(0.00)->after('paid_at');
            $table->enum('payment_mode', ['neft_rtgs', 'cheque', 'upi', 'bank_transfer', 'other'])->nullable()->after('paid_amount');
            $table->string('transaction_reference')->nullable()->after('payment_mode');
            $table->decimal('tds_deducted', 12, 2)->default(0.00)->after('transaction_reference');
            $table->text('payment_remarks')->nullable()->after('tds_deducted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'paid_at',
                'paid_amount',
                'payment_mode',
                'transaction_reference',
                'tds_deducted',
                'payment_remarks',
            ]);
        });
    }
};
