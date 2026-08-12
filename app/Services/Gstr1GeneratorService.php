<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Gstr1Batch;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class Gstr1GeneratorService
{
    public const MAX_INVOICE_NUMBER_LENGTH = 16;

    public const DISCLAIMER = 'Internal reconciliation export only — NOT validated against the current official GSTN offline-tool/API schema. Verify before any government upload.';

    /**
     * Standard Indian State to GST 2-Digit State Code Mapping
     */
    protected static array $stateCodeMap = [
        'JAMMU AND KASHMIR' => '01',
        'HIMACHAL PRADESH'  => '02',
        'PUNJAB'            => '03',
        'CHANDIGARH'        => '04',
        'UTTARAKHAND'       => '05',
        'HARYANA'           => '06',
        'DELHI'             => '07',
        'RAJASTHAN'         => '08',
        'UTTAR PRADESH'     => '09',
        'BIHAR'             => '10',
        'WEST BENGAL'       => '19',
        'JHARKHAND'         => '20',
        'ODISHA'            => '21',
        'CHHATTISGARH'      => '22',
        'MADHYA PRADESH'    => '23',
        'GUJARAT'           => '24',
        'MAHARASHTRA'       => '27',
        'KARNATAKA'         => '29',
        'GOA'               => '30',
        'TAMIL NADU'        => '33',
        'TELANGANA'         => '36',
        'ANDHRA PRADESH'    => '37',
        'KERALA'            => '32',
    ];

    /**
     * Resolve 2-digit GST state code from state name or GSTIN prefix.
     */
    public function resolveStateCode(?string $stateName, ?string $gstin): string
    {
        if ($gstin && strlen(trim($gstin)) >= 2) {
            $prefix = substr(trim($gstin), 0, 2);
            if (is_numeric($prefix)) {
                return sprintf('%02d', (int)$prefix);
            }
        }

        if ($stateName) {
            $normalized = strtoupper(trim($stateName));
            if (isset(self::$stateCodeMap[$normalized])) {
                return self::$stateCodeMap[$normalized];
            }
            if (preg_match('/^(\d{1,2})/', $normalized, $matches)) {
                return sprintf('%02d', (int)$matches[1]);
            }
        }

        return '27'; // Default fallback: Maharashtra 27
    }

    /**
     * Get available invoice months for GSTR-1 generation.
     */
    public function getAvailableMonths(): array
    {
        $generatedPeriods = Gstr1Batch::pluck('return_period')->toArray();

        $months = Invoice::whereNotIn('status', ['draft'])
            ->orderBy('invoice_month', 'desc')
            ->pluck('invoice_month')
            ->map(fn($date) => Carbon::parse($date)->format('Y-m'))
            ->unique()
            ->filter(fn($m) => !in_array($m, $generatedPeriods))
            ->values()
            ->toArray();

        $batches = Gstr1Batch::orderBy('return_period', 'desc')->get();

        return [
            'months' => $months,
            'batches' => $batches,
        ];
    }

    /**
     * Preview GSTR-1 Table 4A (B2B) dataset. Table 12 (HSN) is not available —
     * no per-invoice HSN/SAC data exists in TECLA PAY.
     */
    public function previewGstr1(string $returnPeriod): array
    {
        $monthObj = Carbon::parse($returnPeriod . '-01');
        $startOfMonth = $monthObj->copy()->startOfMonth()->toDateString();
        $endOfMonth = $monthObj->copy()->endOfMonth()->toDateString();

        $invoices = Invoice::with(['client', 'branch'])
            ->whereNotIn('status', ['draft'])
            ->whereBetween('invoice_month', [$startOfMonth, $endOfMonth])
            ->orderBy('invoice_number')
            ->get();

        if ($invoices->isEmpty()) {
            throw ValidationException::withMessages([
                'gstr1' => ["No finalized invoices found for billing month {$returnPeriod}."],
            ]);
        }

        $b2bList = [];
        $errors = [];
        $totalTaxable = 0.0;
        $totalIgst = 0.0;
        $totalCgst = 0.0;
        $totalSgst = 0.0;

        foreach ($invoices as $inv) {
            $customerGstin = trim((string) ($inv->branch_gstin ?: ($inv->client->gstin ?? '')));

            // B2B (Table 4A) requires a registered recipient GSTIN. Never
            // invent one — exclude and report if genuinely absent.
            if ($customerGstin === '') {
                $errors[] = "Invoice {$inv->invoice_number}: no recipient GSTIN on file (branch or client) — excluded from B2B Table 4A.";
                continue;
            }

            if (mb_strlen((string) $inv->invoice_number) > self::MAX_INVOICE_NUMBER_LENGTH) {
                $errors[] = "Invoice {$inv->invoice_number}: number exceeds GSTR-1's " . self::MAX_INVOICE_NUMBER_LENGTH . "-character limit — excluded, not truncated.";
                continue;
            }

            $taxable = (float)$inv->agency_service_fee;
            $totalTaxable += $taxable;

            if ($inv->gst_type === 'igst') {
                $igst = round((float) $inv->igst_amount, 2);
                $cgst = 0.0;
                $sgst = 0.0;
            } else {
                $igst = 0.0;
                $cgst = round((float) $inv->cgst_amount, 2);
                $sgst = round((float) $inv->sgst_amount, 2);
            }

            $totalIgst += $igst;
            $totalCgst += $cgst;
            $totalSgst += $sgst;

            $b2bList[] = [
                'invoice_number' => $inv->invoice_number,
                'invoice_date' => Carbon::parse($inv->created_at ?? $inv->invoice_month)->format('d-m-Y'),
                'client_name' => $inv->client->company_name ?? 'N/A',
                'customer_gstin' => $customerGstin,
                'place_of_supply' => $inv->place_of_supply_state,
                'gst_type' => strtoupper((string)$inv->gst_type),
                'taxable_value' => round($taxable, 2),
                'igst' => round($igst, 2),
                'cgst' => round($cgst, 2),
                'sgst' => round($sgst, 2),
                'total_invoice_value' => round((float)$inv->grand_total, 2),
            ];
        }

        return [
            'success' => true,
            'return_period' => $returnPeriod,
            'invoice_count' => count($b2bList),
            'total_taxable_value' => round($totalTaxable, 2),
            'total_igst' => round($totalIgst, 2),
            'total_cgst' => round($totalCgst, 2),
            'total_sgst' => round($totalSgst, 2),
            'total_tax_liability' => round($totalIgst + $totalCgst + $totalSgst, 2),
            'invoices' => $b2bList,
            'errors' => $errors,
            'table_12_available' => false,
            'table_12_reason' => 'HSN/SAC is not recorded per-invoice or per-line-item anywhere in TECLA PAY — Table 12 cannot be populated from real data.',
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    /**
     * Generate an internal GSTR-1 Table 4A reconciliation JSON + Excel helper
     * for a return period. NOT an official GSTN-upload-ready file — see
     * DISCLAIMER — pending validation against the current GSTN schema.
     */
    public function generateGstr1(string $returnPeriod, ?int $userId = null): array
    {
        $preview = $this->previewGstr1($returnPeriod);

        $monthObj = Carbon::parse($returnPeriod . '-01');
        $startOfMonth = $monthObj->copy()->startOfMonth()->toDateString();
        $endOfMonth = $monthObj->copy()->endOfMonth()->toDateString();

        $invoices = Invoice::with(['client', 'branch'])
            ->whereNotIn('status', ['draft'])
            ->whereBetween('invoice_month', [$startOfMonth, $endOfMonth])
            ->orderBy('invoice_number')
            ->get();

        // Supplier GSTIN is required once for the whole payload — never invent it.
        $firstInvoice = $invoices->first();
        $supplierGstin = $firstInvoice ? trim((string) $firstInvoice->agency_gstin) : '';
        if ($supplierGstin === '') {
            throw ValidationException::withMessages([
                'gstr1' => ['Agency GSTIN is not set on the invoice(s) for this period — cannot generate without it.'],
            ]);
        }

        $fp = Carbon::parse($returnPeriod . '-01')->format('mY'); // e.g. 082026

        // Build B2B Array (Table 4A) from the SAME validated/excluded rows as previewGstr1(),
        // so generation never diverges from what was previewed.
        $b2bGrouped = [];
        foreach ($preview['invoices'] as $row) {
            $posCode = $this->resolveStateCode($row['place_of_supply'], $row['customer_gstin']);

            $invItem = [
                'inum' => (string) $row['invoice_number'],
                'idt' => $row['invoice_date'],
                'val' => $row['total_invoice_value'],
                'pos' => $posCode,
                'rchrg' => 'N',
                'inv_typ' => 'R',
                'itms' => [
                    [
                        'num' => 1,
                        'itm_det' => [
                            'rt' => 18.0,
                            'txval' => $row['taxable_value'],
                            'iamt' => $row['igst'],
                            'camt' => $row['cgst'],
                            'samt' => $row['sgst'],
                            'csamt' => 0.0,
                        ]
                    ]
                ]
            ];

            $ctin = $row['customer_gstin'];
            if (!isset($b2bGrouped[$ctin])) {
                $b2bGrouped[$ctin] = ['ctin' => $ctin, 'inv' => []];
            }
            $b2bGrouped[$ctin]['inv'][] = $invItem;
        }

        $b2bData = array_values($b2bGrouped);

        $jsonPayload = [
            'gstin' => $supplierGstin,
            'fp' => $fp,
            'b2b' => $b2bData,
            'errors' => $preview['errors'],
            'table_12_available' => false,
            'table_12_reason' => $preview['table_12_reason'],
            'disclaimer' => self::DISCLAIMER,
        ];

        // Validate JSON payload
        $encodedJson = json_encode($jsonPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encodedJson === false) {
            throw new \RuntimeException('Failed to encode GSTR-1 payload to JSON format.');
        }

        // Save JSON File
        $periodClean = str_replace('-', '', $returnPeriod);
        $jsonFileName = "GSTR1_Internal_{$supplierGstin}_{$periodClean}.json";
        $jsonFilePath = "gstr1/{$periodClean}/{$jsonFileName}";
        Storage::disk('local')->put($jsonFilePath, $encodedJson);

        // Save XLSX Helper File
        $xlsxFilePath = $this->writeXlsxReport($returnPeriod, $preview);
        $xlsxFileName = basename($xlsxFilePath);

        $fileHash = hash('sha256', $encodedJson);

        $existingBatch = Gstr1Batch::where('return_period', $returnPeriod)->first();

        $attrs = [
            'return_period' => $returnPeriod,
            'invoice_count' => count($preview['invoices']),
            'total_taxable_value' => $preview['total_taxable_value'],
            'total_igst' => $preview['total_igst'],
            'total_cgst' => $preview['total_cgst'],
            'total_sgst' => $preview['total_sgst'],
            'total_tax_liability' => $preview['total_tax_liability'],
            'status' => 'generated',
            'json_file_path' => $jsonFilePath,
            'json_file_name' => $jsonFileName,
            'xlsx_file_path' => $xlsxFilePath,
            'xlsx_file_name' => $xlsxFileName,
            'file_hash' => $fileHash,
            'generated_by' => $userId,
            'generated_at' => now(),
            'created_by' => $userId,
            'updated_by' => $userId,
        ];

        if ($existingBatch) {
            $existingBatch->update($attrs);
            $batch = $existingBatch;
        } else {
            $batch = Gstr1Batch::create($attrs);
        }

        return [
            'success' => true,
            'batch_id' => $batch->id,
            'return_period' => $returnPeriod,
            'invoice_count' => $batch->invoice_count,
            'total_taxable_value' => $batch->total_taxable_value,
            'total_tax_liability' => $batch->total_tax_liability,
            'json_file_name' => $batch->json_file_name,
            'xlsx_file_name' => $batch->xlsx_file_name,
            'json_download_url' => route('compliance.gstr1.download', $batch->id),
            'xlsx_download_url' => route('compliance.gstr1.download_xlsx', $batch->id),
        ];
    }

    /**
     * Write Table 4A B2B sheet + a Notes sheet (Table 12 unavailable, excluded invoices).
     */
    protected function writeXlsxReport(string $returnPeriod, array $preview): string
    {
        $spreadsheet = new Spreadsheet();

        // Sheet 1: Table 4A B2B Invoices (same validated rows as the JSON payload)
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('4A - B2B Invoices');

        $headers1 = [
            'GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice Date',
            'Invoice Value (₹)', 'Place of Supply', 'Reverse Charge', 'Invoice Type',
            'Rate (%)', 'Taxable Value (₹)', 'Integrated Tax (₹)', 'Central Tax (₹)', 'State/UT Tax (₹)', 'Cess (₹)'
        ];

        $sheet1->fromArray([$headers1], null, 'A1');
        $sheet1->getStyle('A1:N1')->getFont()->setBold(true);
        $sheet1->getStyle('A1:N1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('1E3A8A');
        $sheet1->getStyle('A1:N1')->getFont()->getColor()->setRGB('FFFFFF');

        $rowNum = 2;
        foreach ($preview['invoices'] as $row) {
            $posCode = $this->resolveStateCode($row['place_of_supply'], $row['customer_gstin']);

            $sheet1->setCellValue("A{$rowNum}", $row['customer_gstin']);
            $sheet1->setCellValue("B{$rowNum}", $row['client_name']);
            $sheet1->setCellValue("C{$rowNum}", $row['invoice_number']);
            $sheet1->setCellValue("D{$rowNum}", $row['invoice_date']);
            $sheet1->setCellValue("E{$rowNum}", $row['total_invoice_value']);
            $sheet1->setCellValue("F{$rowNum}", "{$posCode}-{$row['place_of_supply']}");
            $sheet1->setCellValue("G{$rowNum}", 'N');
            $sheet1->setCellValue("H{$rowNum}", 'Regular');
            $sheet1->setCellValue("I{$rowNum}", 18.0);
            $sheet1->setCellValue("J{$rowNum}", $row['taxable_value']);
            $sheet1->setCellValue("K{$rowNum}", $row['igst']);
            $sheet1->setCellValue("L{$rowNum}", $row['cgst']);
            $sheet1->setCellValue("M{$rowNum}", $row['sgst']);
            $sheet1->setCellValue("N{$rowNum}", 0.0);

            $rowNum++;
        }

        // Sheet 2: Notes — Table 12 (HSN Summary) is not available; no per-invoice
        // HSN/SAC data exists anywhere in TECLA PAY to populate it from.
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Notes');
        $sheet2->setCellValue('A1', 'Table 12 (HSN Summary): NOT AVAILABLE — ' . $preview['table_12_reason']);
        $sheet2->setCellValue('A2', self::DISCLAIMER);
        if (!empty($preview['errors'])) {
            $sheet2->setCellValue('A4', 'Excluded invoices:');
            $r = 5;
            foreach ($preview['errors'] as $err) {
                $sheet2->setCellValue("A{$r}", $err);
                $r++;
            }
        }

        $periodClean = str_replace('-', '', $returnPeriod);
        $fileName = "GSTR1_Summary_{$periodClean}.xlsx";
        $filePath = "gstr1/{$periodClean}/{$fileName}";

        $tempPath = tempnam(sys_get_temp_dir(), 'gstr1_xlsx_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);
        $binary = file_get_contents($tempPath);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        Storage::disk('local')->put($filePath, $binary);
        @unlink($tempPath);

        return $filePath;
    }

    /**
     * Download JSON or XLSX file for a GSTR-1 batch.
     */
    public function download(int $batchId, string $type = 'json', ?int $userId = null)
    {
        $batch = Gstr1Batch::findOrFail($batchId);
        $isJson = ($type === 'json');

        $filePath = $isJson ? $batch->json_file_path : $batch->xlsx_file_path;
        $fileName = $isJson ? $batch->json_file_name : $batch->xlsx_file_name;
        $mimeType = $isJson ? 'application/json' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (!Storage::disk('local')->exists($filePath)) {
            abort(404, 'GSTR-1 file not found on server.');
        }

        if ($batch->status === 'generated') {
            $batch->update([
                'status' => 'downloaded',
                'downloaded_at' => now(),
                'updated_by' => $userId,
            ]);
        }

        $headers = [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="' . ($fileName ?? 'GSTR1_Export') . '"',
        ];

        return Storage::disk('local')->download($filePath, $fileName, $headers);
    }
}
