<?php

namespace App\Services;

use App\Models\Client;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\Tds24qBatch;
use App\Models\TdsChallan;
use App\Services\TdsCalculationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class Tds24qGeneratorService
{
    protected TdsCalculationService $tdsCalcService;

    public function __construct(TdsCalculationService $tdsCalcService)
    {
        $this->tdsCalcService = $tdsCalcService;
    }

    /**
     * Map months to quarter.
     */
    public function getMonthsForQuarter(string $financialYear, string $quarter): array
    {
        // e.g. FY 2026-2027 => Years 2026 and 2027
        $years = explode('-', $financialYear);
        $startYear = (int)$years[0];
        $endYear = isset($years[1]) ? (int)$years[1] : ($startYear + 1);

        switch (strtoupper($quarter)) {
            case 'Q1':
                return ["{$startYear}-04", "{$startYear}-05", "{$startYear}-06"];
            case 'Q2':
                return ["{$startYear}-07", "{$startYear}-08", "{$startYear}-09"];
            case 'Q3':
                return ["{$startYear}-10", "{$startYear}-11", "{$startYear}-12"];
            case 'Q4':
                return ["{$endYear}-01", "{$endYear}-02", "{$endYear}-03"];
            default:
                throw new \InvalidArgumentException("Invalid quarter '{$quarter}'. Must be Q1, Q2, Q3, or Q4.");
        }
    }

    /**
     * Get all 12 months for the Financial Year.
     */
    public function getAllMonthsForFy(string $financialYear): array
    {
        $years = explode('-', $financialYear);
        $startYear = (int)$years[0];
        $endYear = isset($years[1]) ? (int)$years[1] : ($startYear + 1);

        return [
            "{$startYear}-04", "{$startYear}-05", "{$startYear}-06",
            "{$startYear}-07", "{$startYear}-08", "{$startYear}-09",
            "{$startYear}-10", "{$startYear}-11", "{$startYear}-12",
            "{$endYear}-01", "{$endYear}-02", "{$endYear}-03"
        ];
    }

    /**
     * Validate TAN format (10-char alphanumeric: 4 letters, 5 digits, 1 letter).
     */
    public function isValidTan(?string $tan): bool
    {
        if (empty($tan)) return false;
        return (bool)preg_match('/^[A-Z]{4}\d{5}[A-Z]{1}$/i', trim($tan));
    }

    /**
     * Validate PAN format (10-char alphanumeric: 5 letters, 4 digits, 1 letter).
     */
    public function isValidPan(?string $pan): bool
    {
        if (empty($pan)) return false;
        return (bool)preg_match('/^[A-Z]{5}\d{4}[A-Z]{1}$/i', trim($pan));
    }

    /**
     * Get available clients, FYs, and existing batches for TDS 24Q.
     */
    public function getForm24qMetadata(): array
    {
        $clients = Client::where('status', 'active')->get(['id', 'company_name', 'client_code', 'tan_number', 'pan_number']);
        $batches = Tds24qBatch::with('client')->orderBy('created_at', 'desc')->get();

        return [
            'clients' => $clients,
            'batches' => $batches,
            'fvu_disclaimer' => 'FVU validation NOT RUN (Official Protean FVU.exe not executed in local PHP environment).',
        ];
    }

    /**
     * Preview TDS Form 24Q data before generating return files.
     */
    public function preview24q(int $clientId, string $financialYear, string $quarter): array
    {
        $client = Client::findOrFail($clientId);
        $errors = [];

        if (!$this->isValidTan($client->tan_number)) {
            $errors[] = "Client '{$client->company_name}' TAN '{$client->tan_number}' is missing or invalid. Standard 10-character TAN (e.g. MUMT01234B) is required.";
        }

        if (!$this->isValidPan($client->pan_number)) {
            $errors[] = "Client '{$client->company_name}' PAN '{$client->pan_number}' is missing or invalid. Standard 10-character PAN is required.";
        }

        $targetMonths = $this->getMonthsForQuarter($financialYear, $quarter);

        // Fetch locked payroll runs only
        $runs = PayrollRun::where('client_id', $clientId)
            ->where('status', 'locked')
            ->where(function ($q) use ($targetMonths) {
                foreach ($targetMonths as $m) {
                    $q->orWhere('payroll_month', 'like', "{$m}%");
                }
            })
            ->get();

        if ($runs->isEmpty()) {
            $errors[] = "No LOCKED payroll runs found for Client '{$client->company_name}' in {$quarter} ({$financialYear}). Form 24Q can only be generated from locked payroll data.";
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['tds' => $errors]);
        }

        $runIds = $runs->pluck('id')->toArray();
        $items = PayrollRunItem::with(['employee'])
            ->whereIn('payroll_run_id', $runIds)
            ->where('is_excluded', false)
            ->get();

        $tdsItems = $items->filter(function ($i) {
            return $i->employee && ((float)$i->tds_deduction > 0 || (float)$i->gross_total > 0);
        })->values();

        $totalTaxable = $tdsItems->sum(fn($i) => (float)$i->gross_total);
        $totalTds = $tdsItems->sum(fn($i) => (float)$i->tds_deduction);

        // Check for existing saved challan record
        $existingChallan = TdsChallan::where('client_id', $clientId)
            ->where('financial_year', $financialYear)
            ->where('quarter', $quarter)
            ->first();

        // Q4 Full FY Aggregation preview if Q4
        $q4Annexure2Count = 0;
        if (strtoupper($quarter) === 'Q4') {
            $fyMonths = $this->getAllMonthsForFy($financialYear);
            $allFyRuns = PayrollRun::where('client_id', $clientId)
                ->where('status', 'locked')
                ->where(function ($q) use ($fyMonths) {
                    foreach ($fyMonths as $m) {
                        $q->orWhere('payroll_month', 'like', "{$m}%");
                    }
                })
                ->pluck('id');

            $q4Annexure2Count = PayrollRunItem::whereIn('payroll_run_id', $allFyRuns)
                ->where('is_excluded', false)
                ->distinct('employee_id')
                ->count('employee_id');
        }

        return [
            'success' => true,
            'client_id' => $clientId,
            'client_name' => $client->company_name,
            'tan_number' => $client->tan_number,
            'pan_number' => $client->pan_number,
            'financial_year' => $financialYear,
            'assessment_year' => sprintf('%d-%d', (int)substr($financialYear, 0, 4) + 1, (int)substr($financialYear, 0, 4) + 2),
            'quarter' => strtoupper($quarter),
            'locked_runs_count' => $runs->count(),
            'employee_count' => $tdsItems->pluck('employee_id')->unique()->count(),
            'total_taxable_salary' => round($totalTaxable, 2),
            'total_tds_deducted' => round($totalTds, 2),
            'q4_annual_employee_count' => $q4Annexure2Count,
            'challan' => $existingChallan ? [
                'bsr_code' => $existingChallan->bsr_code,
                'deposit_date' => $existingChallan->deposit_date->format('Y-m-d'),
                'challan_serial_number' => $existingChallan->challan_serial_number,
                'tax_amount' => $existingChallan->tax_amount,
                'surcharge' => $existingChallan->surcharge,
                'cess' => $existingChallan->cess,
                'interest' => $existingChallan->interest,
                'fee_234e' => $existingChallan->fee_234e,
                'total_deposited' => $existingChallan->total_deposited,
            ] : null,
        ];
    }

    /**
     * Save or update treasury challan details for a quarter.
     */
    public function saveChallan(array $data, ?int $userId = null): TdsChallan
    {
        $clientId = (int)$data['client_id'];
        $fy = $data['financial_year'];
        $quarter = strtoupper($data['quarter']);
        $bsr = trim($data['bsr_code']);
        $serial = trim($data['challan_serial_number']);
        $dateStr = $data['deposit_date'];

        $errors = [];

        if (!preg_match('/^\d{7}$/', $bsr)) {
            $errors[] = "BSR Code '{$bsr}' must be exactly 7 digits.";
        }

        if (!preg_match('/^\d{1,5}$/', $serial)) {
            $errors[] = "Challan Serial Number '{$serial}' must be a numeric value up to 5 digits.";
        }

        if (empty($dateStr) || !Carbon::canBeCreatedFromFormat($dateStr, 'Y-m-d')) {
            $errors[] = "Deposit Date '{$dateStr}' is invalid. Use YYYY-MM-DD format.";
        }

        $taxAmount = (float)($data['tax_amount'] ?? 0.00);
        if ($taxAmount < 0) {
            $errors[] = "Tax amount cannot be negative.";
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['tds' => $errors]);
        }

        $surcharge = (float)($data['surcharge'] ?? 0.00);
        $cess = (float)($data['cess'] ?? 0.00);
        $interest = (float)($data['interest'] ?? 0.00);
        $fee234e = (float)($data['fee_234e'] ?? 0.00);
        $totalDeposited = $taxAmount + $surcharge + $cess + $interest + $fee234e;

        $serialFormatted = sprintf('%05d', (int)$serial);

        $challan = TdsChallan::updateOrCreate(
            [
                'client_id' => $clientId,
                'financial_year' => $fy,
                'quarter' => $quarter,
            ],
            [
                'bsr_code' => $bsr,
                'deposit_date' => $dateStr,
                'challan_serial_number' => $serialFormatted,
                'tax_amount' => round($taxAmount, 2),
                'surcharge' => round($surcharge, 2),
                'cess' => round($cess, 2),
                'interest' => round($interest, 2),
                'fee_234e' => round($fee234e, 2),
                'total_deposited' => round($totalDeposited, 2),
                'created_by' => $userId,
                'updated_by' => $userId,
            ]
        );

        return $challan;
    }

    /**
     * Generate official Form 24Q caret-delimited `.txt` return and `.xlsx` reconciliation report.
     */
    public function generate24q(array $requestData, ?int $userId = null): array
    {
        $clientId = (int)$requestData['client_id'];
        $fy = $requestData['financial_year'];
        $quarter = strtoupper($requestData['quarter']);

        $client = Client::findOrFail($clientId);

        // Strict Validation Check
        $errors = [];
        if (!$this->isValidTan($client->tan_number)) {
            $errors[] = "Client TAN '{$client->tan_number}' is missing or invalid. Standard 10-char TAN (e.g. MUMT01234B) is required.";
        }

        if (!$this->isValidPan($client->pan_number)) {
            $errors[] = "Client PAN '{$client->pan_number}' is missing or invalid. Standard 10-char PAN is required.";
        }

        // Fetch Challan Details (must exist or input in request)
        $challan = TdsChallan::where('client_id', $clientId)
            ->where('financial_year', $fy)
            ->where('quarter', $quarter)
            ->first();

        if (!$challan && isset($requestData['challan'])) {
            $challan = $this->saveChallan(array_merge($requestData['challan'], [
                'client_id' => $clientId,
                'financial_year' => $fy,
                'quarter' => $quarter,
            ]), $userId);
        }

        if (!$challan) {
            $errors[] = "Treasury Challan details (BSR Code, Deposit Date, Challan Serial No) are missing for {$quarter} ({$fy}). Please enter verified challan details first.";
        }

        // Fetch locked payroll runs
        $targetMonths = $this->getMonthsForQuarter($fy, $quarter);
        $runs = PayrollRun::where('client_id', $clientId)
            ->where('status', 'locked')
            ->where(function ($q) use ($targetMonths) {
                foreach ($targetMonths as $m) {
                    $q->orWhere('payroll_month', 'like', "{$m}%");
                }
            })
            ->get();

        if ($runs->isEmpty()) {
            $errors[] = "No LOCKED payroll runs found for Client '{$client->company_name}' in {$quarter} ({$fy}). Form 24Q requires locked payroll data.";
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['tds' => $errors]);
        }

        $runIds = $runs->pluck('id')->toArray();
        $items = PayrollRunItem::with(['employee', 'employee.branch'])
            ->whereIn('payroll_run_id', $runIds)
            ->where('is_excluded', false)
            ->get();

        $tdsItems = $items->filter(function ($i) {
            return $i->employee && ((float)$i->tds > 0 || (float)$i->gross_total > 0);
        })->values();

        if ($tdsItems->isEmpty()) {
            throw ValidationException::withMessages([
                'tds' => ["No eligible employee records found in locked payroll runs for {$quarter}."],
            ]);
        }

        // Build 24Q Caret-Delimited `.txt` Return Content
        $txtLines = [];
        $startYearStr = substr($fy, 0, 4);
        $endYearStr = substr((string)((int)$startYearStr + 1), 2, 2);
        $ayStartStr = (string)((int)$startYearStr + 1);
        $ayEndStr = (string)((int)$startYearStr + 2);
        $fyFormat = "20{$startYearStr}20{$endYearStr}"; // e.g. 20262027
        $ayFormat = "20{$ayStartStr}20" . substr($ayEndStr, 2, 2); // e.g. 20272028

        // 1. File Header Record (FH)
        $txtLines[] = implode('^', [
            'FH',
            'SL',
            'R',
            now()->format('dmY'),
            '1',
            strtoupper(trim($client->tan_number)),
            '1',
        ]);

        // 2. Batch Header Record (BH)
        $txtLines[] = implode('^', [
            'BH',
            '1',
            '1', // 1 Challan Record
            '24Q',
            'R',
            "20" . substr($startYearStr, 2, 2) . substr($endYearStr, 0, 2),
            "20" . substr($ayStartStr, 2, 2) . substr($ayEndStr, 2, 2),
            $quarter,
            substr($client->company_name, 0, 75),
            'C', // Category: Company
            strtoupper(trim($client->tan_number)),
            strtoupper(trim($client->pan_number)),
            substr($client->company_name, 0, 75),
            'IN',
            'compliance@teclapayroll.local',
            '02222001122',
            'COMPLIANCE OFFICER',
            'CHIEF FINANCIAL OFFICER',
        ]);

        // 3. Challan Record (CD)
        $txtLines[] = implode('^', [
            'CD',
            '1',
            sprintf('%05d', (int)$challan->challan_serial_number),
            count($tdsItems),
            sprintf('%07d', (int)$challan->bsr_code),
            Carbon::parse($challan->deposit_date)->format('dmY'),
            sprintf('%05d', (int)$challan->challan_serial_number),
            number_format($challan->tax_amount, 2, '.', ''),
            number_format($challan->surcharge, 2, '.', ''),
            number_format($challan->cess, 2, '.', ''),
            number_format($challan->interest, 2, '.', ''),
            number_format($challan->fee_234e, 2, '.', ''),
            number_format($challan->total_deposited, 2, '.', ''),
        ]);

        // 4. Deductee Records (DD — Annexure-I)
        $deducteeLineNo = 1;
        foreach ($tdsItems as $item) {
            $emp = $item->employee;
            $pan = trim((string)$emp->pan_number);
            $panValue = $this->isValidPan($pan) ? strtoupper($pan) : 'PANNOTAVBL';
            $payDate = Carbon::parse($item->payrollRun->payroll_month ?? now())->endOfMonth()->format('dmY');
            $gross = round((float)$item->gross_total, 2);
            $tds = round((float)($item->tds_deduction ?? $item->tds ?? 0.00), 2);
            $reasonCode = ($panValue === 'PANNOTAVBL') ? 'C' : '';

            $txtLines[] = implode('^', [
                'DD',
                '1',
                sprintf('%05d', (int)$challan->challan_serial_number),
                (string)$deducteeLineNo,
                $panValue,
                substr($emp->full_name, 0, 75),
                $payDate,
                number_format($gross, 2, '.', ''),
                number_format($tds, 2, '.', ''),
                $payDate,
                $reasonCode,
            ]);

            $deducteeLineNo++;
        }

        // 5. Salary Details Records (SD — Annexure-II Mandatory in Q4 Only)
        $sdRecordsCount = 0;
        if ($quarter === 'Q4') {
            $fyMonths = $this->getAllMonthsForFy($fy);
            $allFyRuns = PayrollRun::where('client_id', $clientId)
                ->where('status', 'locked')
                ->where(function ($q) use ($fyMonths) {
                    foreach ($fyMonths as $m) {
                        $q->orWhere('payroll_month', 'like', "{$m}%");
                    }
                })
                ->pluck('id');

            $fyItems = PayrollRunItem::with('employee')
                ->whereIn('payroll_run_id', $allFyRuns)
                ->where('is_excluded', false)
                ->get()
                ->groupBy('employee_id');

            $sdLineNo = 1;
            foreach ($fyItems as $empId => $empRuns) {
                $firstItem = $empRuns->first();
                $emp = $firstItem->employee;
                if (!$emp) continue;

                $annualGross = round($empRuns->sum(fn($r) => (float)$r->gross_total), 2);
                $annualTds = round($empRuns->sum(fn($r) => (float)($r->tds_deduction ?? $r->tds ?? 0.00)), 2);
                $pan = trim((string)$emp->pan_number);
                $panValue = $this->isValidPan($pan) ? strtoupper($pan) : 'PANNOTAVBL';

                // Calculate standard deduction (₹75,000 in New / ₹50,000 in Old)
                $regime = strtolower($emp->tds_regime ?: 'new');
                $stdDed = ($regime === 'old') ? 50000.00 : 75000.00;
                $taxableIncome = max(0.00, $annualGross - $stdDed);

                $txtLines[] = implode('^', [
                    'SD',
                    '1',
                    (string)$sdLineNo,
                    $panValue,
                    substr($emp->full_name, 0, 75),
                    'G', // General category
                    "0104{$startYearStr}",
                    "3103{$endYearStr}",
                    number_format($annualGross, 2, '.', ''),
                    '0.00', // Exempt Sec 10
                    number_format($stdDed, 2, '.', ''),
                    '0.00', // Chapter VI-A
                    number_format($taxableIncome, 2, '.', ''),
                    number_format($annualTds, 2, '.', ''),
                    number_format($annualTds, 2, '.', ''),
                ]);

                $sdLineNo++;
                $sdRecordsCount++;
            }
        }

        $rawTxtContent = implode("\r\n", $txtLines);

        // Self-Verification of Generated File
        $this->verifyGeneratedTxtContent($rawTxtContent, $quarter);

        // Save TXT Return File
        $cleanCompany = preg_replace('/[^A-Za-z0-9]/', '', $client->company_name);
        $txtFileName = "Form24Q_{$cleanCompany}_{$fy}_{$quarter}.txt";
        $txtFilePath = "tds_24q/{$clientId}/{$txtFileName}";
        Storage::disk('local')->put($txtFilePath, $rawTxtContent);

        // Save 4-Sheet XLSX Reconciliation Report
        $xlsxFilePath = $this->writeXlsxReconciliationReport($client, $fy, $quarter, $challan, $tdsItems, $quarter === 'Q4' ? ($fyItems ?? null) : null);
        $xlsxFileName = basename($xlsxFilePath);

        $fileHash = hash('sha256', $rawTxtContent);

        $totalGross = $tdsItems->sum(fn($i) => (float)$i->gross_total);
        $totalTds = $tdsItems->sum(fn($i) => (float)($i->tds_deduction ?? $i->tds ?? 0.00));

        $existingBatch = Tds24qBatch::where('client_id', $clientId)
            ->where('financial_year', $fy)
            ->where('quarter', $quarter)
            ->first();

        $attrs = [
            'client_id' => $clientId,
            'financial_year' => $fy,
            'assessment_year' => sprintf('%d-%d', (int)substr($fy, 0, 4) + 1, (int)substr($fy, 0, 4) + 2),
            'quarter' => $quarter,
            'employee_count' => $tdsItems->pluck('employee_id')->unique()->count(),
            'total_taxable_salary' => round($totalGross, 2),
            'total_tds_deducted' => round($totalTds, 2),
            'total_tax_deposited' => round($challan->total_deposited, 2),
            'status' => 'generated',
            'txt_file_path' => $txtFilePath,
            'txt_file_name' => $txtFileName,
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
            $batch = Tds24qBatch::create($attrs);
        }

        // Link challan to batch
        $challan->update(['tds_24q_batch_id' => $batch->id]);

        return [
            'success' => true,
            'batch_id' => $batch->id,
            'financial_year' => $fy,
            'quarter' => $quarter,
            'employee_count' => $batch->employee_count,
            'total_taxable_salary' => $batch->total_taxable_salary,
            'total_tds_deducted' => $batch->total_tds_deducted,
            'total_tax_deposited' => $batch->total_tax_deposited,
            'fvu_disclaimer' => 'FVU validation NOT RUN (Official Protean FVU.exe utility not executed in local environment).',
            'txt_file_name' => $batch->txt_file_name,
            'xlsx_file_name' => $batch->xlsx_file_name,
            'txt_download_url' => route('compliance.tds_24q.download', $batch->id),
            'xlsx_download_url' => route('compliance.tds_24q.download_xlsx', $batch->id),
        ];
    }

    /**
     * Self-Verification of generated caret-delimited `.txt` content.
     */
    public function verifyGeneratedTxtContent(string $content, string $quarter): void
    {
        $lines = explode("\r\n", trim($content));
        if (count($lines) < 4) {
            throw new \RuntimeException('Form 24Q verification failed: expected at least 4 record lines (FH, BH, CD, DD).');
        }

        $fhFields = explode('^', $lines[0]);
        if ($fhFields[0] !== 'FH' || $fhFields[1] !== 'SL') {
            throw new \RuntimeException('Form 24Q verification failed: invalid Header Record (FH).');
        }

        $bhFields = explode('^', $lines[1]);
        if ($bhFields[0] !== 'BH' || $bhFields[3] !== '24Q') {
            throw new \RuntimeException('Form 24Q verification failed: invalid Batch Header (BH).');
        }

        $cdFields = explode('^', $lines[2]);
        if ($cdFields[0] !== 'CD') {
            throw new \RuntimeException('Form 24Q verification failed: invalid Challan Record (CD).');
        }

        $hasSd = false;
        foreach ($lines as $l) {
            if (str_starts_with($l, 'SD^')) {
                $hasSd = true;
                break;
            }
        }

        if ($quarter === 'Q4' && !$hasSd) {
            throw new \RuntimeException('Form 24Q verification failed: Q4 return must contain Annexure-II (SD) records.');
        }
    }

    /**
     * Write 4-Sheet Excel Reconciliation Helper Workbook.
     */
    protected function writeXlsxReconciliationReport(Client $client, string $fy, string $quarter, TdsChallan $challan, $tdsItems, $fyItems = null): string
    {
        $spreadsheet = new Spreadsheet();

        // Sheet 1: Summary
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('Summary');
        $sheet1->fromArray([
            ['FORM 24Q RECONCILIATION SUMMARY REPORT'],
            ['Company Name:', $client->company_name],
            ['TAN Number:', $client->tan_number],
            ['PAN Number:', $client->pan_number],
            ['Financial Year:', $fy],
            ['Quarter:', $quarter],
            ['Total Deductees:', count($tdsItems)],
            ['Total Taxable Salary (₹):', $tdsItems->sum(fn($i) => (float)$i->gross_total)],
            ['Total TDS Deducted (₹):', $tdsItems->sum(fn($i) => (float)($i->tds_deduction ?? $i->tds ?? 0.00))],
            ['Total Tax Deposited (₹):', $challan->total_deposited],
            ['FVU Status:', 'FVU validation NOT RUN'],
        ]);
        $sheet1->getStyle('A1:B1')->getFont()->setBold(true);

        // Sheet 2: Challan
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Challan');
        $sheet2->fromArray([
            ['BSR Code', 'Deposit Date', 'Challan Serial No', 'Tax Amount (₹)', 'Surcharge (₹)', 'Cess (₹)', 'Interest (₹)', 'Fee Sec 234E (₹)', 'Total Deposited (₹)'],
            [
                $challan->bsr_code,
                $challan->deposit_date->format('d-m-Y'),
                $challan->challan_serial_number,
                $challan->tax_amount,
                $challan->surcharge,
                $challan->cess,
                $challan->interest,
                $challan->fee_234e,
                $challan->total_deposited,
            ]
        ]);
        $sheet2->getStyle('A1:I1')->getFont()->setBold(true);

        // Sheet 3: Annexure-I Deductees
        $sheet3 = $spreadsheet->createSheet();
        $sheet3->setTitle('Annexure-I Deductees');
        $sheet3->fromArray([
            ['Line #', 'Employee Code', 'Employee Name', 'Employee PAN', 'Payment Month', 'Gross Salary (₹)', 'TDS Deducted (₹)', 'Deduction Date', 'Reason Flag']
        ]);
        $sheet3->getStyle('A1:I1')->getFont()->setBold(true);

        $rowNum = 2;
        foreach ($tdsItems as $idx => $item) {
            $emp = $item->employee;
            $pan = trim((string)$emp->pan_number);
            $panValue = $this->isValidPan($pan) ? strtoupper($pan) : 'PANNOTAVBL';
            $payDate = Carbon::parse($item->payrollRun->payroll_month ?? now())->endOfMonth()->format('d-m-Y');

            $sheet3->setCellValue("A{$rowNum}", $idx + 1);
            $sheet3->setCellValue("B{$rowNum}", $emp->employee_code);
            $sheet3->setCellValue("C{$rowNum}", $emp->full_name);
            $sheet3->setCellValue("D{$rowNum}", $panValue);
            $sheet3->setCellValue("E{$rowNum}", $item->payrollRun->payroll_month);
            $sheet3->setCellValue("F{$rowNum}", (float)$item->gross_total);
            $sheet3->setCellValue("G{$rowNum}", (float)($item->tds_deduction ?? $item->tds ?? 0.00));
            $sheet3->setCellValue("H{$rowNum}", $payDate);
            $sheet3->setCellValue("I{$rowNum}", $panValue === 'PANNOTAVBL' ? 'Flagged 20% (Sec 206AA)' : '');
            $rowNum++;
        }

        // Sheet 4: Annexure-II Q4 Salary Details (Q4 Only)
        if ($quarter === 'Q4' && $fyItems) {
            $sheet4 = $spreadsheet->createSheet();
            $sheet4->setTitle('Annexure-II Q4 Salary');
            $sheet4->fromArray([
                ['Line #', 'Employee Code', 'Employee Name', 'PAN', 'Regime', 'Annual Gross u/s 17 (₹)', 'Exempt Sec 10 (₹)', 'Std Deduction Sec 16(ia) (₹)', 'Taxable Salary (₹)', 'Total TDS Deposited (₹)']
            ]);
            $sheet4->getStyle('A1:J1')->getFont()->setBold(true);

            $r4 = 2;
            foreach ($fyItems as $empId => $empRuns) {
                $firstItem = $empRuns->first();
                $emp = $firstItem->employee;
                if (!$emp) continue;

                $annualGross = (float)$empRuns->sum(fn($r) => (float)$r->gross_total);
                $annualTds = (float)$empRuns->sum(fn($r) => (float)($r->tds_deduction ?? $r->tds ?? 0.00));
                $pan = trim((string)$emp->pan_number);
                $panValue = $this->isValidPan($pan) ? strtoupper($pan) : 'PANNOTAVBL';
                $regime = strtoupper($emp->tds_regime ?: 'NEW');
                $stdDed = ($regime === 'OLD') ? 50000.00 : 75000.00;
                $taxable = max(0.00, $annualGross - $stdDed);

                $sheet4->setCellValue("A{$r4}", $r4 - 1);
                $sheet4->setCellValue("B{$r4}", $emp->employee_code);
                $sheet4->setCellValue("C{$r4}", $emp->full_name);
                $sheet4->setCellValue("D{$r4}", $panValue);
                $sheet4->setCellValue("E{$r4}", $regime);
                $sheet4->setCellValue("F{$r4}", $annualGross);
                $sheet4->setCellValue("G{$r4}", 0.0);
                $sheet4->setCellValue("H{$r4}", $stdDed);
                $sheet4->setCellValue("I{$r4}", $taxable);
                $sheet4->setCellValue("J{$r4}", $annualTds);
                $r4++;
            }
        }

        $cleanCompany = preg_replace('/[^A-Za-z0-9]/', '', $client->company_name);
        $fileName = "Form24Q_Reconciliation_{$cleanCompany}_{$fy}_{$quarter}.xlsx";
        $filePath = "tds_24q/{$client->id}/{$fileName}";

        $tempPath = tempnam(sys_get_temp_dir(), 'tds24q_xlsx_');
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
     * Download TXT or XLSX file for a Form 24Q batch.
     */
    public function download(int $batchId, string $type = 'txt', ?int $userId = null)
    {
        $batch = Tds24qBatch::findOrFail($batchId);
        $isTxt = ($type === 'txt');

        $filePath = $isTxt ? $batch->txt_file_path : $batch->xlsx_file_path;
        $fileName = $isTxt ? $batch->txt_file_name : $batch->xlsx_file_name;
        $mimeType = $isTxt ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (!Storage::disk('local')->exists($filePath)) {
            abort(404, 'Form 24Q file not found on server.');
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
            'Content-Disposition' => 'attachment; filename="' . ($fileName ?? 'Form24Q') . '"',
        ];

        return Storage::disk('local')->download($filePath, $fileName, $headers);
    }
}
