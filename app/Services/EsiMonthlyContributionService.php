<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EsiMonthlyBatch;
use App\Models\EsiReasonCode;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xls;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Generates the official ESIC Monthly Contribution file for a single locked
 * payroll run. Read-only downstream consumer of payroll_run_items — never
 * recalculates or modifies any payroll, PF, or payslip figures.
 *
 * Output: Excel 97-2003 (.xls), no header row, exactly 6 columns, every cell
 * explicit Text (no formulas, no auto-numeric cells):
 *   1. IP Number  2. IP Name  3. No. of Days  4. Total Monthly Wages
 *   5. Reason for 0 Wages  6. Last Working Day
 *
 * Reason codes are never hardcoded/invented here — always read from the
 * esi_reason_codes master table (App\Models\EsiReasonCode).
 */
class EsiMonthlyContributionService
{
    public const COLUMN_COUNT = 6;

    /**
     * Build the eligible-employee list for a locked run, split into
     * "normal" (paid_days > 0, auto Reason Code 0) and "zero_days"
     * (paid_days == 0, requires an explicit reason selection from the caller).
     */
    public function preview(int $payrollRunId): array
    {
        $payrollRun = PayrollRun::with('client')->findOrFail($payrollRunId);

        if ($payrollRun->status !== 'locked') {
            throw ValidationException::withMessages([
                'esi' => ["ESI Monthly Contribution file requires a LOCKED payroll run. Current status is '" . strtoupper($payrollRun->status) . "'."],
            ]);
        }

        $eligible = $this->eligibleItems($payrollRun);

        $normal = [];
        $zeroDays = [];

        foreach ($eligible as $item) {
            $emp = $item->employee;
            $row = [
                'employee_id' => $emp->id,
                'employee_code' => $emp->employee_code,
                'employee_name' => $emp->full_name,
                'paid_days' => (int) round((float) $item->paid_days),
                'gross_total' => round((float) $item->gross_total, 2),
                'last_working_day' => $emp->last_working_day,
            ];

            if ($row['paid_days'] > 0) {
                $normal[] = $row;
            } else {
                $zeroDays[] = $row;
            }
        }

        $client = $payrollRun->client;
        $esiCode = trim((string) ($client->esi_code_number ?? ''));

        return [
            'success' => true,
            'payroll_run_id' => $payrollRun->id,
            'client_id' => $client->id,
            'client_name' => $client->company_name ?? '',
            'esi_code_number' => $esiCode,
            'missing_esi_code' => empty($esiCode),
            'normal_employee_count' => count($normal),
            'zero_day_employees' => $zeroDays,
        ];
    }

    /**
     * Active ESIC reason codes for the UI dropdown. Never hardcoded.
     */
    public function activeReasonCodes()
    {
        return EsiReasonCode::active()->orderBy('sort_order')->get(['code', 'name', 'requires_last_working_day']);
    }

    /**
     * Generate the .xls file for the given payroll run and persist a batch record.
     *
     * @param array<int,int> $reasons employee_id => esi_reason_codes.code, required for every zero-day employee.
     */
    public function generate(int $payrollRunId, array $reasons = [], ?int $userId = null): array
    {
        $payrollRun = PayrollRun::with('client')->findOrFail($payrollRunId);

        if ($payrollRun->status !== 'locked') {
            throw ValidationException::withMessages([
                'esi' => ["ESI Monthly Contribution file requires a LOCKED payroll run. Current status is '" . strtoupper($payrollRun->status) . "'."],
            ]);
        }

        $client = $payrollRun->client;
        $esiCode = trim((string) ($client->esi_code_number ?? ''));
        if (empty($esiCode)) {
            throw ValidationException::withMessages([
                'esi' => ["ESI Code Number is not configured for client '{$client->company_name}'. Please update client statutory settings."],
            ]);
        }

        $eligible = $this->eligibleItems($payrollRun);

        if ($eligible->isEmpty()) {
            throw ValidationException::withMessages([
                'esi' => ['No ESI-eligible employees found in this locked payroll run.'],
            ]);
        }

        // Load only active reason codes — never invent/hardcode a code here.
        $reasonCodesByCode = EsiReasonCode::active()->get()->keyBy('code');

        $rows = [];
        $totalWages = 0.0;
        $zeroDayReasonsUsed = [];
        $errors = [];

        foreach ($eligible as $item) {
            $emp = $item->employee;
            $ipNumber = trim((string) ($emp->esic_number ?? ''));
            $ipName = trim((string) $emp->full_name);
            $noOfDays = (int) round((float) $item->paid_days);
            $totalMonthlyWages = round((float) $item->gross_total, 2);

            if ($noOfDays > 0) {
                $reasonCodeValue = 0;
                $lastWorkingDay = ' ';
            } else {
                $selected = $reasons[$emp->id] ?? null;

                if ($selected === null) {
                    $errors[] = "Employee {$emp->employee_code} ({$emp->full_name}) has 0 paid days — a Reason for 0 Wages must be selected.";
                    continue;
                }

                $reasonCode = $reasonCodesByCode->get((int) $selected);
                if (!$reasonCode) {
                    $errors[] = "Employee {$emp->employee_code} ({$emp->full_name}): reason code '{$selected}' is invalid or inactive.";
                    continue;
                }

                if ($reasonCode->requires_last_working_day && empty($emp->last_working_day)) {
                    $errors[] = "Employee {$emp->employee_code} ({$emp->full_name}): reason '{$reasonCode->name}' requires a Last Working Day, but none is recorded.";
                    continue;
                }

                $reasonCodeValue = $reasonCode->code;
                $lastWorkingDay = $reasonCode->requires_last_working_day
                    ? Carbon::parse($emp->last_working_day)->format('d-m-Y')
                    : ' ';

                $zeroDayReasonsUsed[$emp->id] = $reasonCodeValue;
            }

            $totalWages += $totalMonthlyWages;

            $rows[] = [
                $ipNumber,
                $ipName,
                (string) $noOfDays,
                number_format($totalMonthlyWages, 2, '.', ''),
                (string) $reasonCodeValue,
                $lastWorkingDay,
            ];
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['esi' => $errors]);
        }

        $filePath = $this->writeXlsFile($client, $payrollRun, $rows);
        $fileContent = Storage::disk('local')->get($filePath);
        $fileHash = hash('sha256', $fileContent);
        $fileName = basename($filePath);

        $existingBatch = EsiMonthlyBatch::where('payroll_run_id', $payrollRun->id)->first();

        $attrs = [
            'client_id' => $client->id,
            'payroll_run_id' => $payrollRun->id,
            'esi_code_number' => $client->esi_code_number,
            'wage_month' => $payrollRun->payroll_month,
            'employee_count' => count($rows),
            'total_wages' => round($totalWages, 2),
            'zero_day_reasons' => $zeroDayReasonsUsed ?: null,
            'status' => 'generated',
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_hash' => $fileHash,
            'generated_by' => $userId,
            'generated_at' => now(),
            'updated_by' => $userId,
        ];

        if ($existingBatch) {
            $existingBatch->update($attrs);
            $batch = $existingBatch;
        } else {
            $batch = EsiMonthlyBatch::create($attrs + ['created_by' => $userId]);
        }

        return [
            'success' => true,
            'batch_id' => $batch->id,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_hash' => $fileHash,
            'employee_count' => count($rows),
            'total_wages' => round($totalWages, 2),
            'download_url' => route('compliance.esi_monthly.download', $batch->id),
        ];
    }

    /**
     * ESI-eligible, non-excluded items for a locked run — reads the payroll
     * engine's own already-computed employee_esi > 0, never re-derives it.
     */
    protected function eligibleItems(PayrollRun $payrollRun)
    {
        $items = PayrollRunItem::with('employee')
            ->where('payroll_run_id', $payrollRun->id)
            ->where('is_excluded', false)
            ->get();

        return $items->filter(function ($item) {
            return $item->employee
                && (bool) $item->employee->esi_applicable
                && (float) $item->employee_esi > 0;
        })->values();
    }

    /**
     * Build the .xls workbook (official ESIC header row on Row 1, exactly 6 explicit-Text columns),
     * verify it before it is ever exposed for download, and save it to local storage.
     */
    protected function writeXlsFile($client, PayrollRun $payrollRun, array $rows): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Official ESIC Monthly Contribution Excel Header Row
        $headers = [
            "IP Number\n(10 Digits)",
            "IP Name\n( Only alphabets and space )",
            "No of Days for which wages paid/payable during the month",
            "Total Monthly Wages",
            "Reason Code for Zero workings days(numeric only; provide 0 for all other reasons- Click on the link for reference)",
            "Last Working Day\n( Format DD/MM/YYYY or DD-MM-YYYY)"
        ];

        // 1. Set Generous Column Widths to prevent header squishing
        $widths = [
            'A' => 18, // IP Number (10 Digits)
            'B' => 32, // IP Name (Only alphabets and space)
            'C' => 26, // No of Days for which wages paid/payable...
            'D' => 22, // Total Monthly Wages
            'E' => 42, // Reason Code for Zero workings days...
            'F' => 24, // Last Working Day (Format DD/MM/YYYY...)
        ];

        foreach ($widths as $col => $w) {
            $sheet->getColumnDimension($col)->setWidth($w);
        }

        // Set Header Row Height & Header Styling
        $sheet->getRowDimension(1)->setRowHeight(52);

        // Write Header Row at Row 1
        for ($col = 0; $col < self::COLUMN_COUNT; $col++) {
            $colLetter = chr(65 + $col); // A..F
            $sheet->setCellValueExplicit("{$colLetter}1", $headers[$col], DataType::TYPE_STRING);
        }

        // Apply Premium ESIC Header Styling
        $sheet->getStyle('A1:F1')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 9,
                'name' => 'Calibri',
                'color' => ['rgb' => '1F3864'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'EBF5FB'], // Light ESIC Cyan Header fill
            ],
        ]);

        // 2. Write Data Rows starting from Row 2 with clean alignments
        $rowNum = 2;
        foreach ($rows as $row) {
            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            for ($col = 0; $col < self::COLUMN_COUNT; $col++) {
                $colLetter = chr(65 + $col); // A..F
                $sheet->setCellValueExplicit("{$colLetter}{$rowNum}", (string) ($row[$col] ?? ''), DataType::TYPE_STRING);
            }
            $sheet->getStyle("A{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("B{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle("C{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("D{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT);
            $sheet->getStyle("E{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("F{$rowNum}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $rowNum++;
        }

        $cleanCompany = preg_replace('/[^A-Za-z0-9]/', '', $client->company_name);
        $monthStr = Carbon::parse($payrollRun->payroll_month)->format('Ym');
        $fileName = "ESI_{$cleanCompany}_{$monthStr}.xls";
        $filePath = "esi_monthly/{$client->id}/{$fileName}";

        $tempPath = tempnam(sys_get_temp_dir(), 'esi_xls_');
        $writer = new Xls($spreadsheet);
        $writer->save($tempPath);
        $binary = file_get_contents($tempPath);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        try {
            $this->verifyGeneratedFile($tempPath, count($rows));
        } catch (\Throwable $e) {
            @unlink($tempPath);
            throw $e;
        }

        Storage::disk('local')->put($filePath, $binary);
        @unlink($tempPath);

        return $filePath;
    }

    /**
     * Re-opens the freshly written .xls and asserts: exactly 6 columns (A-F),
     * header row on Row 1, data rows from Row 2, no 7th column, and no formula cells.
     */
    protected function verifyGeneratedFile(string $path, int $dataRowCount): void
    {
        if ($dataRowCount < 1) {
            return;
        }

        $expectedTotalRows = $dataRowCount + 1; // 1 header row + data rows

        $check = IOFactory::load($path);
        $sheet = $check->getActiveSheet();

        $highestColumn = $sheet->getHighestDataColumn();
        if ($highestColumn !== 'F') {
            $check->disconnectWorksheets();
            throw new \RuntimeException(
                "ESI Monthly Contribution file failed verification: expected exactly 6 columns (A-F), found data up to column {$highestColumn}."
            );
        }

        $highestRow = (int) $sheet->getHighestDataRow();
        if ($highestRow !== $expectedTotalRows) {
            $check->disconnectWorksheets();
            throw new \RuntimeException(
                "ESI Monthly Contribution file failed verification: expected {$expectedTotalRows} row(s) (1 header + {$dataRowCount} data), found {$highestRow}."
            );
        }

        for ($row = 1; $row <= $expectedTotalRows; $row++) {
            $cellG = $sheet->getCell("G{$row}", false);
            if ($cellG !== null && $cellG->getValue() !== null && $cellG->getValue() !== '') {
                $check->disconnectWorksheets();
                throw new \RuntimeException("ESI Monthly Contribution file failed verification: unexpected 7th column with data on row {$row}.");
            }

            foreach (['A', 'B', 'C', 'D', 'E', 'F'] as $colLetter) {
                $cell = $sheet->getCell("{$colLetter}{$row}");
                if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                    $check->disconnectWorksheets();
                    throw new \RuntimeException("ESI Monthly Contribution file failed verification: formula cell found at {$colLetter}{$row}.");
                }
            }
        }

        $check->disconnectWorksheets();
    }

    /**
     * Stream download of a generated .xls file and mark the batch as downloaded.
     */
    public function download(int $batchId, ?int $userId = null)
    {
        $batch = EsiMonthlyBatch::findOrFail($batchId);

        if (!Storage::disk('local')->exists($batch->file_path)) {
            abort(404, 'ESI Monthly Contribution file not found on server.');
        }

        if ($batch->status === 'generated') {
            $batch->update([
                'status' => 'downloaded',
                'downloaded_at' => now(),
                'updated_by' => $userId,
            ]);
        }

        $headers = [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => 'attachment; filename="' . ($batch->file_name ?? 'ESI_Monthly.xls') . '"',
        ];

        return Storage::disk('local')->download($batch->file_path, $batch->file_name, $headers);
    }
}
