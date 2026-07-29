<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Client;
use App\Models\Employee;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class InvoicePdfService
{
    /**
     * Generate raw PDF binary bytes for a given Invoice.
     *
     * @param Invoice $invoice
     * @return string
     */
    public function generatePdfBinary(Invoice $invoice): string
    {
        $invoice->load(['client', 'branch', 'lineItems.employee', 'additionalFees']);
        $client = $invoice->client;
        $branch = $invoice->branch;

        // Determine dominant employment_model from line items' employees
        $lineItemEmployees = $invoice->lineItems->pluck('employee')->filter();
        $isEor = $lineItemEmployees->contains(fn($e) => $e->employment_model === 'eor');

        // Employment-model based branding resolution (EOR vs Agency)
        if ($isEor) {
            $issuerName = $client->display_name_override ?: $client->company_name;
            $issuerAddress = $client->formatted_registered_address;
            $issuerGstin = $client->decrypted_gstin ?: '—';
            $logoPath = $client->logo_path;
        } else {
            $issuerName = SettingsService::get('company_profile.agency_legal_name', 'Tecla Agency Private Limited');
            $issuerAddress = SettingsService::get('company_profile.registered_office_address', 'BKC, Bandra East, Mumbai, Maharashtra');
            $issuerGstin = SettingsService::get('company_profile.agency_gstin', '27AABCM1234N1ZQ');
            $logoPath = SettingsService::get('branding.logo_path');
        }

        // Clean logo URL / path for DomPDF
        $logoUrl = null;
        if ($logoPath) {
            $fullPath = storage_path('app/public/' . $logoPath);
            if (file_exists($fullPath)) {
                $logoUrl = $fullPath;
            }
        }

        // Client "Billed To" Details
        $billedToName = $client->company_name;
        $billedToCode = $client->client_code;
        $billedToAddress = $client->formatted_registered_address;
        $billedToGstin = $client->decrypted_gstin ?: ($branch->gstin ?: '—');
        $branchName = $branch ? $branch->branch_name : 'Head Office';

        // Bank Details from Settings
        $bankDetails = [
            'bank_name' => SettingsService::get('invoicing.bank_name', 'HDFC Bank'),
            'account_number' => SettingsService::get('invoicing.account_number', '50200012345678'),
            'ifsc_code' => SettingsService::get('invoicing.ifsc_code', 'HDFC0000240'),
            'branch_name' => SettingsService::get('invoicing.branch_name', 'Bandra East Branch, Mumbai'),
        ];

        // Payment Instructions & Terms
        $paymentInstructions = SettingsService::get('invoicing.payment_instructions', 'Please make payment via NEFT/RTGS to the specified bank account within due date.');
        $termsAndConditions = SettingsService::get('invoicing.terms_and_conditions', "1. Payment due within specified Net terms.\n2. 18% GST applicable on agency service & candidate fees.\n3. Invoice disputes must be raised within the dispute window.");

        // Formatted dates and numbers
        $formattedDate = Carbon::parse($invoice->created_at)->format('d M Y');
        $formattedDueDate = Carbon::parse($invoice->due_date)->format('d M Y');
        $formattedMonth = Carbon::parse($invoice->invoice_month)->format('F Y');

        $grandTotalWords = $this->numberToEnglishWords((int)round((float)$invoice->grand_total));

        $data = [
            'invoice' => $invoice,
            'client' => $client,
            'branch' => $branch,
            'issuerName' => $issuerName,
            'issuerAddress' => $issuerAddress,
            'issuerGstin' => $issuerGstin,
            'logoUrl' => $logoUrl,
            'billedToName' => $billedToName,
            'billedToCode' => $billedToCode,
            'billedToAddress' => $billedToAddress,
            'billedToGstin' => $billedToGstin,
            'branchName' => $branchName,
            'bankDetails' => $bankDetails,
            'paymentInstructions' => $paymentInstructions,
            'termsAndConditions' => $termsAndConditions,
            'formattedDate' => $formattedDate,
            'formattedDueDate' => $formattedDueDate,
            'formattedMonth' => $formattedMonth,
            'grandTotalWords' => $grandTotalWords,
            'isEor' => $isEor,
        ];

        $pdf = Pdf::loadView('pdf.invoice', $data)
            ->setPaper('a4', 'portrait')
            ->setOption('isRemoteEnabled', true);

        return $pdf->output();
    }

    private function numberToEnglishWords(int $number): string
    {
        if ($number === 0) return 'Zero Rupees Only';
        $words = [];
        $words[0] = ''; $words[1] = 'One'; $words[2] = 'Two'; $words[3] = 'Three'; $words[4] = 'Four';
        $words[5] = 'Five'; $words[6] = 'Six'; $words[7] = 'Seven'; $words[8] = 'Eight'; $words[9] = 'Nine';
        $words[10] = 'Ten'; $words[11] = 'Eleven'; $words[12] = 'Twelve'; $words[13] = 'Thirteen';
        $words[14] = 'Fourteen'; $words[15] = 'Fifteen'; $words[16] = 'Sixteen'; $words[17] = 'Seventeen';
        $words[18] = 'Eighteen'; $words[19] = 'Nineteen'; $words[20] = 'Twenty'; $words[30] = 'Thirty';
        $words[40] = 'Forty'; $words[50] = 'Fifty'; $words[60] = 'Sixty'; $words[70] = 'Seventy';
        $words[80] = 'Eighty'; $words[90] = 'Ninety';

        if ($number < 0) return 'Negative ' . $this->numberToEnglishWords(abs($number));

        $result = '';
        if ($number >= 10000000) {
            $result .= $this->numberToEnglishWords(intval($number / 10000000)) . ' Crore ';
            $number %= 10000000;
        }
        if ($number >= 100000) {
            $result .= $this->numberToEnglishWords(intval($number / 100000)) . ' Lakh ';
            $number %= 100000;
        }
        if ($number >= 1000) {
            $result .= $this->numberToEnglishWords(intval($number / 1000)) . ' Thousand ';
            $number %= 1000;
        }
        if ($number >= 100) {
            $result .= $this->numberToEnglishWords(intval($number / 100)) . ' Hundred ';
            $number %= 100;
        }
        if ($number > 0) {
            if ($number < 20) {
                $result .= $words[$number];
            } else {
                $result .= $words[intval($number / 10) * 10];
                if ($number % 10 > 0) {
                    $result .= '-' . $words[$number % 10];
                }
            }
        }
        return trim($result) . ' Rupees Only';
    }
}
