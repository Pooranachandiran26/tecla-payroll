<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EsiMonthlyBatch;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xls;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

/**
 * Generates the official ESIC Monthly Contribution file for a single locked
 * payroll run. Read-only downstream consumer of payroll_run_items — never
 * recalculates or modifies any payroll, PF, or payslip figures.
 *
 * Output format (fixed, per requirement): Excel 97-2003 (.xls), no header
 * row, exactly 6 columns per the standard ESIC bulk-contribution layout:
 *   1. IP Number            2. IP Name
 *   3. No. of Days          4. Total Monthly Wages
 *   5. Reason Code          6. Last Working Day
 */
class EsiMonthlyContributionService
{
    public const COLUMN_COUNT = 6;

    /**
     * Generate the .xls file for the given payroll run and persist a batch record.
     */
    public function generate(int $payrollRunId, ?int $userId = null): array
    {
        $payrollRun = PayrollRun::with('client')->findOrFail($payrollRunId);

        // Locked payroll data only — no other status is accepted.
        if ($payrollRun->status !== 'locked') {
            throw ValidationException::withMessages([
                'esi' => ["ESI Monthly Contribution file requires a LOCKED payroll run. Current status is '" . strtoupper($payrollRun->status) . "'."],
            ]);
        }

        $client = $payrollRun->client;

        $items = PayrollRunItem::with('employee')
            ->where('payroll_run_id', $payrollRun->id)
            ->where('is_excluded', false)
            ->get();

        // Eligible = ESI-applicable employee AND payroll engine actually contributed ESI this month.
        // Reads the already-computed result only; does not re-derive ESI eligibility itself.
        $eligible = $items->filter(function ($item) {
            return $item->employee
                && (bool) $item->employee->esi_applicable
                && (float) $item->employee_esi > 0;
        })->values();

        if ($eligible->isEmpty()) {
            throw ValidationException::withMessages([
                'esi' => ['No ESI-eligible employees found in this locked payroll run.'],
            ]);
        }

        $payrollMonth = Carbon::parse($payrollRun->payroll_month);
        $rows = [];
        $totalWages = 0.0;

        foreach ($eligible as $item) {
            $emp = $item->employee;

            $ipNumber = trim((string) ($emp->esic_number ?? ''));
            $ipName = trim((string) $emp->full_name);
            $noOfDays = (int) round((float) $item->paid_days);
            $totalMonthlyWages = round((float) $item->gross_total, 2);
            $reasonCode = '';
            $lastWorkingDay = '';

            if (!empty($emp->last_working_day)) {
                $lwd = Carbon::parse($emp->last_working_day);
                if ($lwd->isSameMonth($payrollMonth) && $lwd->isSameYear($payrollMonth)) {
                    $lastWorkingDay = $lwd->format('d-m-Y');
                }
            }

            $totalWages += $totalMonthlyWages;

            $rows[] = [$ipNumber, $ipName, $noOfDays, $totalMonthlyWages, $reasonCode, $lastWorkingDay];
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
     * Build the .xls workbook (no header row, exactly 6 columns) and save it to local storage.
     */
    protected function writeXlsFile($client, PayrollRun $payrollRun, array $rows): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $rowNum = 1;
        foreach ($rows as $row) {
            // IP Number kept as an explicit string cell to preserve any leading
            // zeros / avoid Excel auto-converting a long number to scientific notation.
            $sheet->setCellValueExplicit("A{$rowNum}", $row[0], DataType::TYPE_STRING);
            $sheet->setCellValue("B{$rowNum}", $row[1]);
            $sheet->setCellValue("C{$rowNum}", $row[2]);
            $sheet->setCellValue("D{$rowNum}", $row[3]);
            $sheet->setCellValueExplicit("E{$rowNum}", $row[4], DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("F{$rowNum}", $row[5], DataType::TYPE_STRING);
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
        @unlink($tempPath);

        Storage::disk('local')->put($filePath, $binary);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $filePath;
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
