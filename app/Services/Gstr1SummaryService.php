<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Setting;
use Carbon\Carbon;

/**
 * Internal GSTR-1 (Table 4A — B2B) reconciliation export.
 *
 * Read-only: reuses invoice GST fields already computed by
 * InvoiceGenerationService / Invoice::recalculateTotals(). Does not
 * recalculate GST, does not touch payroll/PF/ESI/PT/TDS, does not modify
 * invoices. NOT an official GSTN upload file — an internal reconciliation
 * export only, pending validation against the current GSTN offline-tool
 * schema.
 */
class Gstr1SummaryService
{
    public const DISCLAIMER = 'Internal reconciliation export only — NOT validated against the current official GSTN offline-tool/API schema. Verify before any government upload.';

    public const MAX_INVOICE_NUMBER_LENGTH = 16;

    /**
     * @param string $month Y-m, filtered against invoice created_at (the
     *   existing invoice date used elsewhere, e.g. InvoicePdfService).
     */
    public function build(string $month): array
    {
        $period = Carbon::parse($month . '-01');

        $invoices = Invoice::with('client')
            ->whereYear('created_at', $period->year)
            ->whereMonth('created_at', $period->month)
            ->orderBy('created_at')
            ->get();

        $rows = [];
        $errors = [];
        $reverseCharge = $this->reverseChargeDefault();

        foreach ($invoices as $invoice) {
            $recipientGstin = trim((string) ($invoice->branch_gstin ?? ''));
            $clientGstin = trim((string) ($invoice->client->gstin ?? ''));

            // B2B (Table 4A) requires a registered recipient GSTIN. Do not
            // invent one — exclude and report if genuinely absent.
            if ($recipientGstin === '' && $clientGstin === '') {
                $errors[] = "Invoice {$invoice->invoice_number}: no recipient GSTIN on file (branch or client) — cannot be reported under B2B Table 4A.";
                continue;
            }

            if (mb_strlen($invoice->invoice_number) > self::MAX_INVOICE_NUMBER_LENGTH) {
                $errors[] = "Invoice {$invoice->invoice_number}: number exceeds GSTR-1's " . self::MAX_INVOICE_NUMBER_LENGTH . "-character limit — excluded, not truncated.";
                continue;
            }

            $isIntraState = $invoice->gst_type === 'cgst_sgst';

            $rows[] = [
                'gstin_recipient' => $recipientGstin !== '' ? $recipientGstin : $clientGstin,
                'receiver_name' => $invoice->client->company_name ?? '',
                'invoice_number' => $invoice->invoice_number,
                'invoice_date' => Carbon::parse($invoice->created_at)->format('d-m-Y'),
                'invoice_value' => round((float) $invoice->grand_total, 2),
                'place_of_supply' => $invoice->place_of_supply_state,
                'reverse_charge' => $reverseCharge ? 'Y' : 'N',
                'taxable_value' => round((float) $invoice->agency_service_fee, 2),
                'integrated_tax' => $isIntraState ? 0 : round((float) $invoice->igst_amount, 2),
                'central_tax' => $isIntraState ? round((float) $invoice->cgst_amount, 2) : 0,
                'state_ut_tax' => $isIntraState ? round((float) $invoice->sgst_amount, 2) : 0,
                // No cess field/rate exists anywhere in TECLA's GST configuration
                // (GstSettingsSeeder has no cess key) — 0 reflects that, not an assumption.
                'cess' => 0,
            ];
        }

        return [
            'success' => true,
            'month' => $month,
            'row_count' => count($rows),
            'rows' => $rows,
            'errors' => $errors,
            'table_12_available' => false,
            'table_12_reason' => 'HSN/SAC is not recorded per-invoice or per-line-item anywhere in TECLA PAY; only a single default SAC exists in global GST settings, not usable for a real HSN summary.',
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    protected function reverseChargeDefault(): bool
    {
        $setting = Setting::where('group', 'gst')->where('key', 'default_reverse_charge')->first();
        return $setting ? filter_var($setting->value, FILTER_VALIDATE_BOOLEAN) : false;
    }

    public function toCsv(array $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, [
            'GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date',
            'Invoice Value', 'Place of Supply', 'Reverse Charge', 'Taxable Value',
            'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess',
        ]);
        foreach ($rows as $row) {
            fputcsv($handle, [
                $row['gstin_recipient'], $row['receiver_name'], $row['invoice_number'], $row['invoice_date'],
                $row['invoice_value'], $row['place_of_supply'], $row['reverse_charge'], $row['taxable_value'],
                $row['integrated_tax'], $row['central_tax'], $row['state_ut_tax'], $row['cess'],
            ]);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }
}
