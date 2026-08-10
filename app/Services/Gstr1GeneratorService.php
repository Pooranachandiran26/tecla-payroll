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
        $months = Invoice::whereNotIn('status', ['draft'])
            ->selectRaw("DATE_FORMAT(invoice_month, '%Y-%m') as month_str")
            ->distinct()
            ->orderBy('month_str', 'desc')
            ->pluck('month_str')
            ->toArray();

        $batches = Gstr1Batch::orderBy('return_period', 'desc')->get();

        return [
            'months' => $months,
            'batches' => $batches,
        ];
    }

    /**
     * Preview GSTR-1 dataset (Table 4A B2B and Table 12 HSN Summary).
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
        $totalTaxable = 0.0;
        $totalIgst = 0.0;
        $totalCgst = 0.0;
        $totalSgst = 0.0;

        foreach ($invoices as $inv) {
            $taxable = (float)$inv->agency_service_fee;
            $totalTaxable += $taxable;

            $gstAmount = (float)$inv->gst_amount;

            if ($inv->gst_type === 'igst') {
                $igst = $gstAmount;
                $cgst = 0.0;
                $sgst = 0.0;
            } else {
                $igst = 0.0;
                $cgst = round($gstAmount / 2, 2);
                $sgst = round($gstAmount / 2, 2);
            }

            $totalIgst += $igst;
            $totalCgst += $cgst;
            $totalSgst += $sgst;

            $b2bList[] = [
                'invoice_number' => $inv->invoice_number,
                'invoice_date' => Carbon::parse($inv->created_at ?? $inv->invoice_month)->format('d-m-Y'),
                'client_name' => $inv->client->company_name ?? 'N/A',
                'customer_gstin' => $inv->branch_gstin ?: ($inv->client->gstin ?? 'UNREGISTERED'),
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
            'hsn_summary' => [
                'hsn_sc' => '9985',
                'desc' => 'Human Resources & Payroll Management Services',
                'uqc' => 'OTH',
                'qty' => count($b2bList),
                'txval' => round($totalTaxable, 2),
                'igst' => round($totalIgst, 2),
                'cgst' => round($totalCgst, 2),
                'sgst' => round($totalSgst, 2),
            ]
        ];
    }

    /**
     * Generate official GSTR-1 JSON and Excel Helper files for a return period.
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

        $firstInvoice = $invoices->first();
        $supplierGstin = $firstInvoice ? ($firstInvoice->agency_gstin ?: '27AAACT1234A1Z5') : '27AAACT1234A1Z5';
        $fp = Carbon::parse($returnPeriod . '-01')->format('mY'); // e.g. 082026

        // Build B2B Array (Table 4A) according to GSTN Schema v1.1
        $b2bGrouped = [];
        foreach ($invoices as $inv) {
            $customerGstin = trim((string)($inv->branch_gstin ?: ($inv->client->gstin ?? '')));
            if (empty($customerGstin)) {
                $customerGstin = '27AAACT9999A1Z1'; // Fallback sample format if missing
            }

            $posCode = $this->resolveStateCode($inv->place_of_supply_state, $customerGstin);
            $taxable = round((float)$inv->agency_service_fee, 2);
            $gstAmount = (float)$inv->gst_amount;

            if ($inv->gst_type === 'igst') {
                $igst = round($gstAmount, 2);
                $cgst = 0.0;
                $sgst = 0.0;
            } else {
                $igst = 0.0;
                $cgst = round($gstAmount / 2, 2);
                $sgst = round($gstAmount / 2, 2);
            }

            $invItem = [
                'inum' => (string)$inv->invoice_number,
                'idt' => Carbon::parse($inv->created_at ?? $inv->invoice_month)->format('d-m-Y'),
                'val' => round((float)$inv->grand_total, 2),
                'pos' => $posCode,
                'rchrg' => 'N',
                'inv_typ' => 'R',
                'itms' => [
                    [
                        'num' => 1,
                        'itm_det' => [
                            'rt' => 18.0,
                            'txval' => $taxable,
                            'iamt' => $igst,
                            'camt' => $cgst,
                            'samt' => $sgst,
                            'csamt' => 0.0,
                        ]
                    ]
                ]
            ];

            if (!isset($b2bGrouped[$customerGstin])) {
                $b2bGrouped[$customerGstin] = [
                    'ctin' => $customerGstin,
                    'inv' => []
                ];
            }
            $b2bGrouped[$customerGstin]['inv'][] = $invItem;
        }

        $b2bData = array_values($b2bGrouped);

        // Build Table 12 HSN Summary
        $hsnData = [
            'data' => [
                [
                    'num' => 1,
                    'hsn_sc' => '9985',
                    'desc' => 'Human Resources & Payroll Management Services',
                    'uqc' => 'OTH',
                    'qty' => count($invoices),
                    'val' => $preview['total_taxable_value'] + $preview['total_tax_liability'],
                    'txval' => $preview['total_taxable_value'],
                    'iamt' => $preview['total_igst'],
                    'camt' => $preview['total_cgst'],
                    'samt' => $preview['total_sgst'],
                    'csamt' => 0.0,
                ]
            ]
        ];

        $jsonPayload = [
            'gstin' => $supplierGstin,
            'fp' => $fp,
            'gt' => 0.0,
            'cur_gt' => 0.0,
            'version' => 'GST3.0',
            'hash' => 'hash',
            'b2b' => $b2bData,
            'hsn' => $hsnData,
        ];

        // Validate JSON payload
        $encodedJson = json_encode($jsonPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($encodedJson === false) {
            throw new \RuntimeException('Failed to encode GSTR-1 payload to JSON format.');
        }

        // Save JSON File
        $periodClean = str_replace('-', '', $returnPeriod);
        $jsonFileName = "GSTR1_{$supplierGstin}_{$periodClean}.json";
        $jsonFilePath = "gstr1/{$periodClean}/{$jsonFileName}";
        Storage::disk('local')->put($jsonFilePath, $encodedJson);

        // Save XLSX Helper File
        $xlsxFilePath = $this->writeXlsxReport($returnPeriod, $invoices, $preview);
        $xlsxFileName = basename($xlsxFilePath);

        $fileHash = hash('sha256', $encodedJson);

        $existingBatch = Gstr1Batch::where('return_period', $returnPeriod)->first();

        $attrs = [
            'return_period' => $returnPeriod,
            'invoice_count' => count($invoices),
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
     * Write 2-sheet Excel Helper report matching GSTR-1 Offline Tool format.
     */
    protected function writeXlsxReport(string $returnPeriod, $invoices, array $preview): string
    {
        $spreadsheet = new Spreadsheet();

        // Sheet 1: Table 4A B2B Invoices
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
        foreach ($invoices as $inv) {
            $customerGstin = trim((string)($inv->branch_gstin ?: ($inv->client->gstin ?? 'UNREGISTERED')));
            $posCode = $this->resolveStateCode($inv->place_of_supply_state, $customerGstin);
            $posDisplay = "{$posCode}-{$inv->place_of_supply_state}";
            $taxable = (float)$inv->agency_service_fee;
            $gstAmount = (float)$inv->gst_amount;

            if ($inv->gst_type === 'igst') {
                $igst = $gstAmount;
                $cgst = 0.0;
                $sgst = 0.0;
            } else {
                $igst = 0.0;
                $cgst = round($gstAmount / 2, 2);
                $sgst = round($gstAmount / 2, 2);
            }

            $sheet1->setCellValue("A{$rowNum}", $customerGstin);
            $sheet1->setCellValue("B{$rowNum}", $inv->client->company_name ?? 'N/A');
            $sheet1->setCellValue("C{$rowNum}", $inv->invoice_number);
            $sheet1->setCellValue("D{$rowNum}", Carbon::parse($inv->created_at ?? $inv->invoice_month)->format('d-m-Y'));
            $sheet1->setCellValue("E{$rowNum}", (float)$inv->grand_total);
            $sheet1->setCellValue("F{$rowNum}", $posDisplay);
            $sheet1->setCellValue("G{$rowNum}", 'N');
            $sheet1->setCellValue("H{$rowNum}", 'Regular');
            $sheet1->setCellValue("I{$rowNum}", 18.0);
            $sheet1->setCellValue("J{$rowNum}", $taxable);
            $sheet1->setCellValue("K{$rowNum}", $igst);
            $sheet1->setCellValue("L{$rowNum}", $cgst);
            $sheet1->setCellValue("M{$rowNum}", $sgst);
            $sheet1->setCellValue("N{$rowNum}", 0.0);

            $rowNum++;
        }

        // Sheet 2: Table 12 HSN Summary
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('12 - HSN Summary');

        $headers2 = [
            'HSN/SAC', 'Description', 'UQC', 'Total Quantity', 'Total Taxable Value (₹)',
            'Integrated Tax (₹)', 'Central Tax (₹)', 'State/UT Tax (₹)', 'Cess (₹)'
        ];

        $sheet2->fromArray([$headers2], null, 'A1');
        $sheet2->getStyle('A1:I1')->getFont()->setBold(true);
        $sheet2->getStyle('A1:I1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('065F46');
        $sheet2->getStyle('A1:I1')->getFont()->getColor()->setRGB('FFFFFF');

        $hsn = $preview['hsn_summary'];
        $sheet2->setCellValue('A2', $hsn['hsn_sc']);
        $sheet2->setCellValue('B2', $hsn['desc']);
        $sheet2->setCellValue('C2', $hsn['uqc']);
        $sheet2->setCellValue('D2', $hsn['qty']);
        $sheet2->setCellValue('E2', $hsn['txval']);
        $sheet2->setCellValue('F2', $hsn['igst']);
        $sheet2->setCellValue('G2', $hsn['cgst']);
        $sheet2->setCellValue('H2', $hsn['sgst']);
        $sheet2->setCellValue('I2', 0.0);

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
