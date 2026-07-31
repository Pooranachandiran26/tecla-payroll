<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\PayrollRun;
use App\Models\Invoice;
use App\Services\InvoiceGenerationService;
use Illuminate\Support\Facades\DB;

echo "=== TESTING END-TO-END INVOICE GENERATION FOR LIVE RUN ===\n\n";

$run = PayrollRun::find(1);
$client = DB::table('clients')->where('id', $run->client_id)->first();

echo "Client Name: {$client->company_name}\n";
echo "Billing Model: " . ($client->billing_model ?? 'ctc_markup') . "\n";
echo "Markup %: " . ($client->markup_percentage ?? '5.00') . "%\n";
echo "PO Number: {$client->po_number}\n";
echo "PO Value: ₹" . number_format((float)$client->po_value, 2) . "\n";
echo "Payment Net Terms: {$client->payment_net_terms}\n\n";

$genService = app(InvoiceGenerationService::class);
$invoices = $genService->generateForRun($run);

echo "✓ Generated " . count($invoices) . " invoice(s)!\n\n";

foreach ($invoices as $inv) {
    echo "--- INVOICE DETAILS ---\n";
    echo "Invoice Number: {$inv->invoice_number}\n";
    echo "Status: {$inv->status}\n";
    echo "Gross Passthrough: ₹" . number_format($inv->gross_salary_passthrough, 2) . "\n";
    echo "Agency Service Fee: ₹" . number_format($inv->agency_service_fee, 2) . "\n";
    echo "GST Amount (18%): ₹" . number_format($inv->gst_amount, 2) . "\n";
    echo "Grand Total Invoice Amount: ₹" . number_format($inv->grand_total, 2) . "\n";
    echo "Due Date: {$inv->due_date}\n";
    echo "PO Number Attached: {$inv->po_number}\n";
    echo "Delivery Format: {$inv->delivery_format}\n\n";

    echo "--- INVOICE LINE ITEMS ---\n";
    foreach ($inv->lineItems as $item) {
        echo "Employee ID: {$item->employee_id} | Gross Pay: ₹{$item->gross_pay} | Agency Fee: ₹{$item->agency_fee} | Line Total: ₹{$item->line_total}\n";
    }
}

// Clean up test draft invoice so DB remains clean for user's UI click
Invoice::where('payroll_run_id', $run->id)->delete();
echo "\n(Cleaned up test draft invoice so user can click 'Lock' in UI cleanly)\n";
