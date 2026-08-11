<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\PtChallanBatch;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

/**
 * Generates State-wise PT Filing & Reconciliation Export (.xlsx) from locked
 * payroll data only. Does not modify or re-calculate any payroll figures.
 */
class PtChallanGeneratorService
{
    /**
     * Preview PT compliance items for a locked payroll run.
     */
    public function preview(int $payrollRunId): array
    {
        $payrollRun = PayrollRun::with('client')->findOrFail($payrollRunId);

        if ($payrollRun->status !== 'locked') {
            throw ValidationException::withMessages([
                'pt' => ["PT Challan export requires a LOCKED payroll run. Current status is '" . strtoupper($payrollRun->status) . "'."],
            ]);
        }

        $client = $payrollRun->client;

        $items = PayrollRunItem::with(['employee', 'employee.branch'])
            ->where('payroll_run_id', $payrollRun->id)
            ->where('is_excluded', false)
            ->get();

        $ptItems = $items->filter(function ($item) {
            return $item->employee && (float)$item->professional_tax > 0;
        })->values();

        if ($ptItems->isEmpty()) {
            throw ValidationException::withMessages([
                'pt' => ['No PT-deducted employees found in this locked payroll run.'],
            ]);
        }

        $stateBreakdown = [];
        $totalPt = 0.0;

        foreach ($ptItems as $item) {
            $state = $this->resolvePtState($item->employee, $client);
            $regNo = $this->resolvePtRegNo($item->employee, $client, $state);
            $amount = (float)$item->professional_tax;
            $gross = (float)$item->gross_total;

            if (!isset($stateBreakdown[$state])) {
                $stateBreakdown[$state] = [
                    'state' => $state,
                    'pt_reg_no' => $regNo,
                    'count' => 0,
                    'total_gross' => 0.0,
                    'total_pt' => 0.0,
                ];
            }

            $stateBreakdown[$state]['count']++;
            $stateBreakdown[$state]['total_gross'] += $gross;
            $stateBreakdown[$state]['total_pt'] += $amount;
            $totalPt += $amount;
        }

        return [
            'success' => true,
            'payroll_run_id' => $payrollRun->id,
            'wage_month' => $payrollRun->payroll_month,
            'client_name' => $client->company_name,
            'employee_count' => $ptItems->count(),
            'total_pt_amount' => round($totalPt, 2),
            'states' => array_values($stateBreakdown),
        ];
    }

    /**
     * Generate the State-wise PT Export (.xlsx) and create/update batch record.
     */
    public function generate(int $payrollRunId, ?int $userId = null): array
    {
        $payrollRun = PayrollRun::with('client')->findOrFail($payrollRunId);

        if ($payrollRun->status !== 'locked') {
            throw ValidationException::withMessages([
                'pt' => ["PT Challan export requires a LOCKED payroll run. Current status is '" . strtoupper($payrollRun->status) . "'."],
            ]);
        }

        $client = $payrollRun->client;

        $items = PayrollRunItem::with(['employee', 'employee.branch'])
            ->where('payroll_run_id', $payrollRun->id)
            ->where('is_excluded', false)
            ->get();

        $ptItems = $items->filter(function ($item) {
            return $item->employee && (float)$item->professional_tax > 0;
        })->values();

        if ($ptItems->isEmpty()) {
            throw ValidationException::withMessages([
                'pt' => ['No PT-deducted employees found in this locked payroll run.'],
            ]);
        }

        $monthStr = Carbon::parse($payrollRun->payroll_month)->format('Ym');
        $filePath = $this->writeXlsxReport($client, $payrollRun, $ptItems);
        $fileContent = Storage::disk('local')->get($filePath);
        $fileHash = hash('sha256', $fileContent);
        $fileName = basename($filePath);

        $totalPt = $ptItems->sum(fn($i) => (float)$i->professional_tax);

        $existingBatch = PtChallanBatch::where('payroll_run_id', $payrollRun->id)->first();

        $attrs = [
            'client_id' => $client->id,
            'payroll_run_id' => $payrollRun->id,
            'wage_month' => Carbon::parse($payrollRun->payroll_month)->format('Y-m'),
            'employee_count' => $ptItems->count(),
            'total_pt_amount' => round($totalPt, 2),
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
            $batch = PtChallanBatch::create($attrs + ['created_by' => $userId]);
        }

        return [
            'success' => true,
            'batch_id' => $batch->id,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_hash' => $fileHash,
            'employee_count' => $ptItems->count(),
            'total_pt_amount' => round($totalPt, 2),
            'download_url' => route('compliance.pt_challan.download', $batch->id),
        ];
    }

    /**
     * Resolve PT State following existing TECLA PAY fallback priority:
     * 1. client->pt_state
     * 2. employee->branch->state
     * 3. client->registered_state
     */
    protected function resolvePtState($employee, $client): string
    {
        $ptState = $client->pt_state ?? null;

        if (empty($ptState) || $ptState === 'auto') {
            $ptState = $employee->branch->state ?? null;
        }

        if (empty($ptState)) {
            $ptState = $client->registered_state ?? 'Unknown';
        }

        $stateMap = [
            'TN' => 'Tamil Nadu',
            'MH' => 'Maharashtra',
            'KA' => 'Karnataka',
            'TS' => 'Telangana',
            'WB' => 'West Bengal',
            'GJ' => 'Gujarat',
        ];

        return $stateMap[strtoupper($ptState)] ?? $ptState;
    }

    /**
     * Resolve state PT Registration / TIN Number.
     */
    protected function resolvePtRegNo($employee, $client, string $state): string
    {
        if ($employee && isset($employee->branch->pt_registration_number) && !empty($employee->branch->pt_registration_number)) {
            return trim($employee->branch->pt_registration_number);
        }
        if (isset($client->pt_registration_number) && !empty($client->pt_registration_number)) {
            return trim($client->pt_registration_number);
        }
        return 'N/A';
    }

    /**
     * Build 2-sheet Excel report (.xlsx)
     */
    protected function writeXlsxReport($client, PayrollRun $payrollRun, $ptItems): string
    {
        $spreadsheet = new Spreadsheet();

        // Sheet 1: State Summary
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('State PT Summary');

        $headers1 = ['State', 'PT Reg / TIN No', 'Wage Month', 'Employee Count', 'Total Gross Wages (₹)', 'Total PT Deducted (₹)'];
        $sheet1->fromArray($headers1, null, 'A1');

        // Style Header
        $sheet1->getStyle('A1:F1')->getFont()->setBold(true);

        $stateSummary = [];
        foreach ($ptItems as $item) {
            $state = $this->resolvePtState($item->employee, $client);
            $regNo = $this->resolvePtRegNo($item->employee, $client, $state);

            if (!isset($stateSummary[$state])) {
                $stateSummary[$state] = [
                    'state' => $state,
                    'reg_no' => $regNo,
                    'wage_month' => $payrollRun->payroll_month,
                    'count' => 0,
                    'gross' => 0.0,
                    'pt' => 0.0,
                ];
            }

            $stateSummary[$state]['count']++;
            $stateSummary[$state]['gross'] += (float)$item->gross_total;
            $stateSummary[$state]['pt'] += (float)$item->professional_tax;
        }

        $rowNum = 2;
        foreach ($stateSummary as $row) {
            $sheet1->setCellValue("A{$rowNum}", $row['state']);
            $sheet1->setCellValueExplicit("B{$rowNum}", $row['reg_no'], DataType::TYPE_STRING);
            $sheet1->setCellValue("C{$rowNum}", $row['wage_month']);
            $sheet1->setCellValue("D{$rowNum}", $row['count']);
            $sheet1->setCellValue("E{$rowNum}", round($row['gross'], 2));
            $sheet1->setCellValue("F{$rowNum}", round($row['pt'], 2));
            $rowNum++;
        }

        // Sheet 2: Employee Details
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Employee PT Register');

        $headers2 = ['State', 'PT Reg No', 'Wage Month', 'Employee Code', 'Employee Name', 'Gender', 'Branch Location', 'Gross Salary (₹)', 'PT Amount (₹)'];
        $sheet2->fromArray($headers2, null, 'A1');
        $sheet2->getStyle('A1:I1')->getFont()->setBold(true);

        $rowNum2 = 2;
        foreach ($ptItems as $item) {
            $emp = $item->employee;
            $state = $this->resolvePtState($emp, $client);
            $regNo = $this->resolvePtRegNo($emp, $client, $state);

            $sheet2->setCellValue("A{$rowNum2}", $state);
            $sheet2->setCellValueExplicit("B{$rowNum2}", $regNo, DataType::TYPE_STRING);
            $sheet2->setCellValue("C{$rowNum2}", $payrollRun->payroll_month);
            $sheet2->setCellValueExplicit("D{$rowNum2}", $emp->employee_code ?? '', DataType::TYPE_STRING);
            $sheet2->setCellValue("E{$rowNum2}", $emp->full_name ?? '');
            $sheet2->setCellValue("F{$rowNum2}", ucfirst($emp->gender ?? 'N/A'));
            $sheet2->setCellValue("G{$rowNum2}", $emp->branch->name ?? 'Head Office');
            $sheet2->setCellValue("H{$rowNum2}", round((float)$item->gross_total, 2));
            $sheet2->setCellValue("I{$rowNum2}", round((float)$item->professional_tax, 2));
            $rowNum2++;
        }

        $cleanCompany = preg_replace('/[^A-Za-z0-9]/', '', $client->company_name);
        $monthStr = Carbon::parse($payrollRun->payroll_month)->format('Ym');
        $fileName = "PT_Challan_{$cleanCompany}_{$monthStr}.xlsx";
        $filePath = "pt_challan/{$client->id}/{$fileName}";

        $tempPath = tempnam(sys_get_temp_dir(), 'pt_xlsx_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);
        $binary = file_get_contents($tempPath);
        @unlink($tempPath);

        Storage::disk('local')->put($filePath, $binary);

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return $filePath;
    }

    /**
     * Stream file download for a generated PT batch.
     */
    public function download(int $batchId, ?int $userId = null)
    {
        $batch = PtChallanBatch::findOrFail($batchId);

        if (!Storage::disk('local')->exists($batch->file_path)) {
            abort(404, 'PT Challan File not found on server.');
        }

        if ($batch->status === 'generated') {
            $batch->update([
                'status' => 'downloaded',
                'downloaded_at' => now(),
                'updated_by' => $userId,
            ]);
        }

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . ($batch->file_name ?? 'PT_Challan.xlsx') . '"',
        ];

        return Storage::disk('local')->download($batch->file_path, $batch->file_name, $headers);
    }
}
