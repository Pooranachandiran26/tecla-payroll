<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PfEcrBatch;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PfEcrGeneratorService
{
    /**
     * Generate preview payload and validation errors for a finalized payroll run.
     * Uses Official EPFO Unified Portal UAN ECR 11-Field Specification.
     */
    public function preview(int $payrollRunId): array
    {
        $payrollRun = PayrollRun::with(['client'])->findOrFail($payrollRunId);

        // 1. Verify payroll status (must be approved or locked)
        if (!in_array($payrollRun->status, ['approved', 'locked'])) {
            return [
                'success' => false,
                'status' => 'blocked',
                'errors' => ["PF ECR generation requires an APPROVED or LOCKED payroll run. Current status is '" . strtoupper($payrollRun->status) . "'."],
                'payroll_run' => [
                    'id' => $payrollRun->id,
                    'status' => $payrollRun->status,
                    'payroll_month' => $payrollRun->payroll_month,
                ]
            ];
        }

        // 2. Resolve PF Establishment Code
        $client = $payrollRun->client;
        $establishmentCode = $this->resolveEstablishmentCode($client);

        if (empty($establishmentCode)) {
            return [
                'success' => false,
                'status' => 'blocked',
                'errors' => ["PF Establishment Code is not configured for client '{$client->company_name}'. Please update client statutory settings."],
                'payroll_run' => [
                    'id' => $payrollRun->id,
                    'status' => $payrollRun->status,
                    'payroll_month' => $payrollRun->payroll_month,
                    'client_name' => $client->company_name,
                ]
            ];
        }

        // 3. Fetch PF-applicable items from the finalized run + all locked supplementary child runs
        $childRunIds = PayrollRun::where('parent_run_id', $payrollRun->id)
            ->whereIn('status', ['approved', 'locked'])
            ->pluck('id')
            ->toArray();
        $allRunIds = array_merge([$payrollRun->id], $childRunIds);

        $runItems = PayrollRunItem::with('employee')
            ->whereIn('payroll_run_id', $allRunIds)
            ->where('is_excluded', false)
            ->get();

        // Consolidate: apply correction deltas so each employee appears only once
        $runItems = $this->consolidateRunItems($runItems);

        $pfItems = $runItems->filter(function ($item) {
            return $item->employee && (bool)$item->employee->pf_applicable;
        });

        if ($pfItems->isEmpty()) {
            return [
                'success' => false,
                'status' => 'blocked',
                'errors' => ["No PF-applicable employees found in this payroll run."],
                'payroll_run' => [
                    'id' => $payrollRun->id,
                    'status' => $payrollRun->status,
                    'payroll_month' => $payrollRun->payroll_month,
                    'client_name' => $client->company_name,
                ]
            ];
        }

        // 4. Validate records and build preview lines
        $errors = [];
        $lineItems = [];
        
        $totalEpfWages = 0;
        $totalEpsWages = 0;
        $totalEmployeeEpf = 0;
        $totalEmployerEpf = 0;
        $totalEmployerEps = 0;
        $totalNcpDays = 0;

        $wageMonth = Carbon::parse($payrollRun->payroll_month)->format('Y-m');
        $daysInMonth = Carbon::parse($payrollRun->payroll_month)->daysInMonth;

        foreach ($pfItems as $item) {
            $emp = $item->employee;
            $empCode = $emp->employee_code;
            $empName = $emp->full_name;

            // Mandatory Validation: Valid 12-digit UAN is required for EPFO ECR
            $uan = trim($emp->uan_number ?? '');
            if (empty($uan)) {
                $errors[] = "PF ECR cannot be generated. Employee: {$empName} ({$empCode}) - Missing Field: UAN (12-digit Universal Account Number).";
            } elseif (!preg_match('/^\d{12}$/', $uan)) {
                $errors[] = "PF ECR cannot be generated. Employee: {$empName} ({$empCode}) - Invalid Field: UAN must be exactly 12 digits (Given: '{$uan}').";
            }

            // Wages & Contributions
            $basicDa = (float)($item->basic_pay + $item->da);
            $pfCeiling = (float)($client->pf_ceiling ?? 15000);
            
            $epfWage = ($emp->employee_pf_wage_basis === 'actual_basic_da')
                ? $basicDa
                : min($basicDa, $pfCeiling);
            $epfWageInt = (int)round($epfWage);

            // Age & EPS eligibility
            $age = $emp->date_of_birth ? Carbon::parse($emp->date_of_birth)->age : 30;
            $epsEligible = (bool)$emp->eps_applicable && ($age < 58);
            
            $epsWageInt = $epsEligible ? (int)round(min($basicDa, 15000)) : 0;

            // EDLI Wages
            $isEdliExempt = (bool)($client->edli_exempted ?? false);
            $edliWageInt = $isEdliExempt ? 0 : (int)round(min($basicDa, 15000));

            // Gross Wages
            $grossWageInt = (int)round((float)$item->gross_total);

            // Monetary contributions - Official EPFO Remitted Difference Rule
            $eeEpfInt = (int)round((float)$item->employee_pf);
            $epsInt = (int)round((float)$item->employer_eps);

            // Official EPFO Rule: Field 9 (ER EPF) = Field 7 (EE EPF) - Field 8 (EPS Remitted)
            $erEpfInt = max(0, $eeEpfInt - $epsInt);

            // NCP Days
            $ncpInt = (int)round((float)$item->lop_days);
            $ncpInt = min(max(0, $ncpInt), $daysInMonth);

            // Accumulate totals
            $totalEpfWages += $epfWageInt;
            $totalEpsWages += $epsWageInt;
            $totalEmployeeEpf += $eeEpfInt;
            $totalEmployerEpf += $erEpfInt;
            $totalEmployerEps += $epsInt;
            $totalNcpDays += $ncpInt;

            $lineItems[] = [
                'employee_id' => $emp->id,
                'employee_code' => $empCode,
                'uan' => $uan,
                'member_name' => $empName,
                'gross_wages' => $grossWageInt,
                'epf_wages' => $epfWageInt,
                'eps_wages' => $epsWageInt,
                'edli_wages' => $edliWageInt,
                'ee_epf' => $eeEpfInt,
                'eps_contribution' => $epsInt,
                'er_epf' => $erEpfInt,
                'ncp_days' => $ncpInt,
                'refund_advances' => 0,
            ];
        }

        // 5. Monetary Reconciliation Check against Payroll Items
        $dbEeSum = round($pfItems->sum('employee_pf'), 2);
        $dbErSum = round($pfItems->sum('employer_epf'), 2);
        $dbEpsSum = round($pfItems->sum('employer_eps'), 2);

        if (abs($dbEeSum - $totalEmployeeEpf) > 2.00) {
            $errors[] = "Employee EPF total mismatch: Payroll item sum (₹{$dbEeSum}) vs ECR rounded sum (₹{$totalEmployeeEpf}).";
        }
        if (abs($dbErSum - $totalEmployerEpf) > 2.00) {
            $errors[] = "Employer EPF total mismatch: Payroll item sum (₹{$dbErSum}) vs ECR rounded sum (₹{$totalEmployerEpf}).";
        }

        return [
            'success' => empty($errors),
            'status' => empty($errors) ? 'validated' : 'has_errors',
            'errors' => $errors,
            'summary' => [
                'client_id' => $client->id,
                'client_name' => $client->company_name,
                'payroll_run_id' => $payrollRun->id,
                'payroll_month' => $payrollRun->payroll_month,
                'payroll_status' => $payrollRun->status,
                'pf_establishment_code' => $establishmentCode,
                'employee_count' => count($lineItems),
                'total_epf_wages' => $totalEpfWages,
                'total_eps_wages' => $totalEpsWages,
                'total_employee_epf' => $totalEmployeeEpf,
                'total_employer_epf' => $totalEmployerEpf,
                'total_employer_eps' => $totalEmployerEps,
                'total_ncp_days' => $totalNcpDays,
            ],
            'line_items' => array_slice($lineItems, 0, 50),
        ];
    }

    /**
     * Generate official EPFO 11-field #~#-delimited UAN text file and save batch tracking record.
     */
    public function generate(int $payrollRunId, ?int $userId = null): array
    {
        $previewResult = $this->preview($payrollRunId);

        if (!$previewResult['success']) {
            throw ValidationException::withMessages([
                'ecr' => $previewResult['errors']
            ]);
        }

        $summary = $previewResult['summary'];
        $payrollRun = PayrollRun::with(['client'])->findOrFail($payrollRunId);
        $client = $payrollRun->client;
        $establishmentCode = $summary['pf_establishment_code'];

        $childRunIds = PayrollRun::where('parent_run_id', $payrollRun->id)
            ->whereIn('status', ['approved', 'locked'])
            ->pluck('id')
            ->toArray();
        $allRunIds = array_merge([$payrollRun->id], $childRunIds);

        $runItems = PayrollRunItem::with('employee')
            ->whereIn('payroll_run_id', $allRunIds)
            ->where('is_excluded', false)
            ->get();

        $pfItems = $runItems->filter(function ($item) {
            return $item->employee && (bool)$item->employee->pf_applicable;
        });

        $lines = [];
        $wageMonth = Carbon::parse($payrollRun->payroll_month)->format('Y-m');
        $daysInMonth = Carbon::parse($payrollRun->payroll_month)->daysInMonth;

        foreach ($pfItems as $item) {
            $emp = $item->employee;
            
            // Official EPFO 11-Field UAN ECR Layout:
            // 1. UAN
            // 2. Member Name
            // 3. Gross Wages
            // 4. EPF Wages
            // 5. EPS Wages
            // 6. EDLI Wages
            // 7. EE EPF Remitted
            // 8. EPS ER Remitted
            // 9. EPF ER Remitted
            // 10. NCP Days
            // 11. Refund of Advances (0)

            $field1_uan = trim($emp->uan_number);
            $field2_memberName = $this->cleanName($emp->full_name);
            $field3_grossWages = (int)round((float)$item->gross_total);

            $basicDa = (float)($item->basic_pay + $item->da);
            $pfCeiling = (float)($client->pf_ceiling ?? 15000);
            
            $epfWage = ($emp->employee_pf_wage_basis === 'actual_basic_da')
                ? $basicDa
                : min($basicDa, $pfCeiling);
            $field4_epfWages = (int)round($epfWage);

            $age = $emp->date_of_birth ? Carbon::parse($emp->date_of_birth)->age : 30;
            $epsEligible = (bool)$emp->eps_applicable && ($age < 58);
            $field5_epsWages = $epsEligible ? (int)round(min($basicDa, 15000)) : 0;

            $isEdliExempt = (bool)($client->edli_exempted ?? false);
            $field6_edliWages = $isEdliExempt ? 0 : (int)round(min($basicDa, 15000));

            $field7_eeEpfRemitted = (int)round((float)$item->employee_pf);
            $field8_epsErRemitted = (int)round((float)$item->employer_eps);
            // Official EPFO Rule: Field 9 (ER EPF) = Field 7 (EE EPF) - Field 8 (EPS Remitted)
            $field9_epfErRemitted = max(0, $field7_eeEpfRemitted - $field8_epsErRemitted);

            $ncpInt = (int)round((float)$item->lop_days);
            $field10_ncpDays = min(max(0, $ncpInt), $daysInMonth);

            $field11_refundAdvances = 0;

            // Construct 11-field line with #~# delimiter
            $record = [
                $field1_uan,
                $field2_memberName,
                $field3_grossWages,
                $field4_epfWages,
                $field5_epsWages,
                $field6_edliWages,
                $field7_eeEpfRemitted,
                $field8_epsErRemitted,
                $field9_epfErRemitted,
                $field10_ncpDays,
                $field11_refundAdvances,
            ];

            $lines[] = implode('#~#', $record);
        }

        // Assemble plain text content with Windows CRLF (\r\n) line endings
        $fileContent = implode("\r\n", $lines) . "\r\n";

        // File naming convention: ECR_{CompanyName}_{ESTABLISHMENT}_{YYYYMM}.txt
        $cleanEst = preg_replace('/[^A-Za-z0-9]/', '', $establishmentCode);
        $cleanCompany = preg_replace('/[^A-Za-z0-9]/', '', $client->company_name);
        $monthStr = Carbon::parse($payrollRun->payroll_month)->format('Ym');
        $fileName = "ECR_{$cleanCompany}_{$cleanEst}_{$monthStr}.txt";

        $storageFolder = "pf_ecr/{$client->id}";
        $filePath = "{$storageFolder}/{$fileName}";

        // Save to local storage disk
        Storage::disk('local')->put($filePath, $fileContent);

        // Compute SHA-256 file hash for audit integrity
        $fileHash = hash('sha256', $fileContent);

        // Check if an ECR batch record already exists for this payroll run (prevents duplicate history entries)
        $existingBatch = PfEcrBatch::where('payroll_run_id', $payrollRun->id)->first();

        if ($existingBatch) {
            $existingBatch->update([
                'pf_establishment_code' => $establishmentCode,
                'wage_month' => $payrollRun->payroll_month,
                'employee_count' => count($lines),
                'total_epf_wages' => $summary['total_epf_wages'],
                'total_eps_wages' => $summary['total_eps_wages'],
                'total_employee_epf' => $summary['total_employee_epf'],
                'total_employer_epf' => $summary['total_employer_epf'],
                'total_employer_eps' => $summary['total_employer_eps'],
                'total_ncp_days' => $summary['total_ncp_days'],
                'status' => 'generated',
                'file_path' => $filePath,
                'file_name' => $fileName,
                'file_hash' => $fileHash,
                'generated_by' => $userId,
                'generated_at' => now(),
                'updated_by' => $userId,
            ]);
            $batch = $existingBatch;
        } else {
            // Save new batch tracking record
            $batch = PfEcrBatch::create([
                'client_id' => $client->id,
                'payroll_run_id' => $payrollRun->id,
                'pf_establishment_code' => $establishmentCode,
                'wage_month' => $payrollRun->payroll_month,
                'employee_count' => count($lines),
                'total_epf_wages' => $summary['total_epf_wages'],
                'total_eps_wages' => $summary['total_eps_wages'],
                'total_employee_epf' => $summary['total_employee_epf'],
                'total_employer_epf' => $summary['total_employer_epf'],
                'total_employer_eps' => $summary['total_employer_eps'],
                'total_ncp_days' => $summary['total_ncp_days'],
                'status' => 'generated',
                'file_path' => $filePath,
                'file_name' => $fileName,
                'file_hash' => $fileHash,
                'generated_by' => $userId,
                'generated_at' => now(),
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);
        }

        return [
            'success' => true,
            'batch_id' => $batch->id,
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_hash' => $fileHash,
            'download_url' => route('compliance.pf_ecr.download', $batch->id),
            'summary' => $summary,
        ];
    }

    /**
     * Resolve PF Establishment Code from Client settings or global fallback.
     */
    protected function resolveEstablishmentCode(Client $client): string
    {
        if (!empty($client->pf_establishment_code)) {
            return trim($client->pf_establishment_code);
        }

        $setting = Setting::where('key', 'pf_establishment_code')->first();
        return $setting ? trim($setting->value) : '';
    }

    /**
     * Consolidate payroll run items across main + supplementary runs per employee.
     * Applies correction deltas so each employee yields exactly one merged item.
     */
    private function consolidateRunItems($rawItems)
    {
        $numericFields = [
            'paid_days', 'lop_days', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions',
            'gross_total', 'employee_pf', 'employee_esi', 'professional_tax',
            'lwf_deduction', 'lop_deduction', 'tds_deduction', 'loan_emi_deduction',
            'net_pay', 'employer_pf', 'employer_esi', 'employer_eps', 'employer_lwf',
        ];

        return $rawItems->groupBy('employee_id')->map(function ($empItems) use ($numericFields) {
            if ($empItems->count() === 1) {
                return $empItems->first();
            }

            $baseItems = $empItems->filter(fn($i) => !($i->is_correction ?? false));
            $correctionItems = $empItems->filter(fn($i) => (bool)($i->is_correction ?? false));

            $baseItem = clone ($baseItems->first() ?? $empItems->first());

            // Sum all base item numeric fields
            foreach ($numericFields as $field) {
                $baseItem->$field = round((float)$baseItems->sum($field), 2);
            }

            // Apply latest correction delta per original item
            if ($correctionItems->isNotEmpty()) {
                $latestCorrections = $correctionItems->groupBy(function ($item) {
                    return $item->original_payroll_run_item_id ?? ('emp_' . $item->employee_id);
                })->map(function ($group) {
                    return $group->sortByDesc(fn($i) => ($i->created_at ?? '') . '_' . sprintf('%010d', $i->id))->first();
                });

                foreach ($latestCorrections as $corr) {
                    foreach ($numericFields as $field) {
                        $baseItem->$field = round((float)$baseItem->$field + (float)($corr->$field ?? 0), 2);
                    }
                }
            }

            return $baseItem;
        })->values();
    }

    /**
     * Clean employee name to remove invalid characters per EPFO rules.
     */
    protected function cleanName(string $name): string
    {
        $name = preg_replace('/[^A-Za-z0-9\s\.]/', '', $name);
        return trim(preg_replace('/\s+/', ' ', $name));
    }

    /**
     * Stream download of generated .txt return file and update batch tracking status.
     */
    public function download(int $batchId, ?int $userId = null)
    {
        $batch = PfEcrBatch::findOrFail($batchId);

        if (!Storage::disk('local')->exists($batch->file_path)) {
            abort(404, 'PF ECR file not found on server.');
        }

        if ($batch->status === 'generated') {
            $batch->update([
                'status' => 'downloaded',
                'downloaded_at' => now(),
                'updated_by' => $userId,
            ]);
        }

        $headers = [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => 'attachment; filename="' . ($batch->file_name ?? 'PF_ECR.txt') . '"',
        ];

        return Storage::disk('local')->download($batch->file_path, $batch->file_name, $headers);
    }
}
