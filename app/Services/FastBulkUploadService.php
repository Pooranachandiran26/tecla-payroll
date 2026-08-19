<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\SimpleExcel\SimpleExcelReader;

class FastBulkUploadService
{
    protected SalaryCalculationService $salaryService;
    protected array $salaryCache = [];
    protected static ?string $cipherKey = null;

    public function __construct(SalaryCalculationService $salaryService)
    {
        $this->salaryService = $salaryService;
    }

    protected function fastEncrypt(?string $value): ?string
    {
        if ($value === null || $value === '') return null;
        if (self::$cipherKey === null) {
            $key = config('app.key');
            if (str_starts_with($key, 'base64:')) {
                self::$cipherKey = base64_decode(substr($key, 7));
            } else {
                self::$cipherKey = $key;
            }
        }
        $iv = random_bytes(16);
        $value = openssl_encrypt($value, 'AES-256-CBC', self::$cipherKey, 0, $iv);
        $encodedIv = base64_encode($iv);
        $mac = hash_hmac('sha256', $encodedIv . $value, self::$cipherKey);
        $json = json_encode(['iv' => $encodedIv, 'value' => $value, 'mac' => $mac, 'tag' => '']);
        return base64_encode($json);
    }

    public function processUpload($filePath, $batchId, ?callable $progressCallback = null)
    {
        // 1. Pre-fetch all DB uniqueness hashtables in single queries (O(1) lookup time)
        $existingEmpCodes = array_fill_keys(Employee::pluck('employee_code')->filter()->all(), true);
        $existingEmails = array_fill_keys(Employee::pluck('personal_email')->filter()->all(), true);
        $existingUserEmails = array_fill_keys(User::pluck('email')->filter()->all(), true);
        $existingPhones = array_fill_keys(Employee::pluck('phone_number')->filter()->all(), true);
        $existingBankHashes = array_fill_keys(Employee::whereNotNull('bank_account_hash')->pluck('bank_account_hash')->filter()->all(), true);
        $existingPanHashes = array_fill_keys(Employee::whereNotNull('pan_number_hash')->pluck('pan_number_hash')->filter()->all(), true);
        $existingAadhaarHashes = array_fill_keys(Employee::whereNotNull('aadhaar_number_hash')->pluck('aadhaar_number_hash')->filter()->all(), true);

        // Pre-fetch all clients and managers. Draft/incomplete clients are setup records, not
        // operational clients — a bulk upload must not be able to attach employees to one by
        // client_code, even though this bypasses the (already-filtered) Employees dropdown. See
        // Client::scopeOperational().
        $allClients = Client::operational()->with('branches')->get()->keyBy('client_code');
        $allManagers = Employee::select('id', 'employee_code', 'client_id')->get()->keyBy('employee_code');

        $seenEmpCodes = [];
        $seenEmails = [];
        $seenPhones = [];
        $seenPans = [];
        $seenAadhaars = [];
        $seenBankAccounts = [];

        $results = [
            'batch_id' => $batchId,
            'valid_count' => 0,
            'warning_count' => 0,
            'error_count' => 0,
            'total_rows' => 0,
            'rows' => [],
        ];

        $stagingChunks = [];
        $now = now()->toDateTimeString();
        $rowIndex = 1;

        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        // Use fast native CSV reader if CSV, fast XMLReader for XLSX, else SimpleExcelReader fallback
        if ($extension === 'csv' || $extension === 'txt') {
            $fileObj = new \SplFileObject($filePath, 'r');
            $fileObj->setFlags(\SplFileObject::READ_CSV | \SplFileObject::READ_AHEAD | \SplFileObject::SKIP_EMPTY);

            $headers = [];
            foreach ($fileObj as $index => $row) {
                if ($index === 0) {
                    $headers = array_map(fn($h) => Str::snake(trim((string)$h)), $row);
                    continue;
                }

                if (empty($row) || (count($row) === 1 && $row[0] === null)) {
                    continue;
                }

                $normalizedRow = [];
                foreach ($row as $colIdx => $val) {
                    $key = $headers[$colIdx] ?? 'col_' . $colIdx;
                    $normalizedRow[$key] = trim((string)$val);
                }

                $this->processRow(
                    $normalizedRow, $rowIndex, $batchId, $now,
                    $existingEmpCodes, $existingEmails, $existingUserEmails, $existingPhones,
                    $existingBankHashes, $existingPanHashes, $existingAadhaarHashes,
                    $allClients, $allManagers,
                    $seenEmpCodes, $seenEmails, $seenPhones, $seenPans, $seenAadhaars, $seenBankAccounts,
                    $results, $stagingChunks, $progressCallback
                );
            }
        } elseif (($extension === 'xlsx' || $extension === 'xls') && !empty($fastRows = $this->parseXlsxFast($filePath))) {
            foreach ($fastRows as $normalizedRow) {
                $this->processRow(
                    $normalizedRow, $rowIndex, $batchId, $now,
                    $existingEmpCodes, $existingEmails, $existingUserEmails, $existingPhones,
                    $existingBankHashes, $existingPanHashes, $existingAadhaarHashes,
                    $allClients, $allManagers,
                    $seenEmpCodes, $seenEmails, $seenPhones, $seenPans, $seenAadhaars, $seenBankAccounts,
                    $results, $stagingChunks, $progressCallback
                );
            }
        } else {
            $reader = SimpleExcelReader::create($filePath);
            if (method_exists($reader, 'hasSheet') && $reader->hasSheet('Employee Data')) {
                $reader->fromSheetName('Employee Data');
            }

            $reader->getRows()->each(function (array $row) use (
                &$results, &$stagingChunks, &$rowIndex, $batchId, $now,
                $existingEmpCodes, $existingEmails, $existingUserEmails, $existingPhones,
                $existingBankHashes, $existingPanHashes, $existingAadhaarHashes,
                $allClients, $allManagers,
                &$seenEmpCodes, &$seenEmails, &$seenPhones, &$seenPans, &$seenAadhaars, &$seenBankAccounts,
                $progressCallback
            ) {
                $normalizedRow = [];
                foreach ($row as $key => $value) {
                    $normalizedRow[Str::snake(trim((string)$key))] = trim((string)$value);
                }

                $this->processRow(
                    $normalizedRow, $rowIndex, $batchId, $now,
                    $existingEmpCodes, $existingEmails, $existingUserEmails, $existingPhones,
                    $existingBankHashes, $existingPanHashes, $existingAadhaarHashes,
                    $allClients, $allManagers,
                    $seenEmpCodes, $seenEmails, $seenPhones, $seenPans, $seenAadhaars, $seenBankAccounts,
                    $results, $stagingChunks, $progressCallback
                );
            });

            if (method_exists($reader, 'close')) {
                $reader->close();
            }
        }

        // Insert remaining staging chunks
        if (!empty($stagingChunks)) {
            DB::table('bulk_upload_staging_rows')->insert($stagingChunks);
            $stagingChunks = [];
        }

        return $results;
    }

    protected function processRow(
        array $normalizedRow, &$rowIndex, $batchId, $now,
        $existingEmpCodes, $existingEmails, $existingUserEmails, $existingPhones,
        $existingBankHashes, $existingPanHashes, $existingAadhaarHashes,
        $allClients, $allManagers,
        &$seenEmpCodes, &$seenEmails, &$seenPhones, &$seenPans, &$seenAadhaars, &$seenBankAccounts,
        &$results, &$stagingChunks, ?callable $progressCallback = null
    ) {
        $rowIndex++;
        $errors = [];
        $warnings = [];

        // 1. Mandatory Employee Code & Global/Intra-file Uniqueness
        $empCode = $normalizedRow['employee_code'] ?? null;
        if (empty($empCode)) {
            $errors[] = "Mandatory Employee Code is missing.";
        } else {
            if (isset($seenEmpCodes[$empCode])) {
                $errors[] = "Duplicate employee_code '{$empCode}' within this file.";
            }
            $seenEmpCodes[$empCode] = true;

            if (isset($existingEmpCodes[$empCode])) {
                $errors[] = "Employee code '{$empCode}' is already registered to another employee in the system.";
            }
        }

        // 2. Client Resolution
        $clientCode = $normalizedRow['client_code'] ?? null;
        $client = null;
        if (empty($clientCode)) {
            $errors[] = "Client Code is required.";
        } else {
            $client = $allClients->get($clientCode);
            if (!$client) {
                $errors[] = "Client code '{$clientCode}' not found.";
            }
        }

        // 3. Branch Resolution
        $branchId = null;
        if ($client) {
            $branches = $client->branches;
            if ($branches->count() === 1) {
                $branchId = $branches->first()->id;
            } else {
                $branchCodeOrName = trim((string)($normalizedRow['branch_name'] ?? $normalizedRow['branch_code'] ?? ''));
                if ($branchCodeOrName === '') {
                    $errors[] = "Client '{$client->company_name}' has multiple branches — please specify branch_name or branch_code.";
                } else {
                    $matchedBranch = $branches->first(function ($b) use ($branchCodeOrName) {
                        return strcasecmp(trim((string)$b->branch_name), $branchCodeOrName) === 0 
                            || strcasecmp(trim((string)$b->branch_code), $branchCodeOrName) === 0;
                    });
                    if ($matchedBranch) {
                        $branchId = $matchedBranch->id;
                    } else {
                        $errors[] = "Branch '{$branchCodeOrName}' does not exist for client '{$client->company_name}'.";
                    }
                }
            }
        }

        // 4. Intra-file duplicate tracking & DB uniqueness
        $email = $normalizedRow['personal_email'] ?? null;
        if (empty($email)) {
            $errors[] = "Personal email is required.";
        } else {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "The personal email field must be a valid email address.";
            }
            if (isset($seenEmails[$email])) {
                $errors[] = "Duplicate personal_email within this file.";
            }
            $seenEmails[$email] = true;

            if (isset($existingEmails[$email]) || isset($existingUserEmails[$email])) {
                $errors[] = "The personal email has already been taken.";
            }
        }

        $phone = $normalizedRow['phone_number'] ?? null;
        if (empty($phone)) {
            $errors[] = "Phone number is required.";
        } else {
            if (isset($seenPhones[$phone])) {
                $errors[] = "Duplicate phone_number within this file.";
            }
            $seenPhones[$phone] = true;

            if (isset($existingPhones[$phone])) {
                $errors[] = "The phone number has already been taken.";
            }
        }

        $pan = $normalizedRow['pan_number'] ?? null;
        $panHash = null;
        if (empty($pan)) {
            $errors[] = "PAN number is required.";
        } else {
            if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]$/i', $pan)) {
                $errors[] = "The pan number field format is invalid.";
            }
            if (isset($seenPans[$pan])) {
                $errors[] = "Duplicate pan_number within this file.";
            }
            $seenPans[$pan] = true;

            $panHash = hash('sha256', $pan);
            if (isset($existingPanHashes[$panHash])) {
                $errors[] = "This PAN number is already registered to another employee.";
            }
        }

        $aadhaar = $normalizedRow['aadhaar_number'] ?? null;
        $aadhaarHash = null;
        if ($aadhaar) {
            if (isset($seenAadhaars[$aadhaar])) {
                $errors[] = "Duplicate aadhaar_number within this file.";
            }
            $seenAadhaars[$aadhaar] = true;

            $aadhaarHash = hash('sha256', $aadhaar);
            if (isset($existingAadhaarHashes[$aadhaarHash])) {
                $errors[] = "This Aadhaar number is already registered to another employee.";
            }
        }

        $bankAcc = $normalizedRow['bank_account_number'] ?? null;
        $bankHash = null;
        if (empty($bankAcc)) {
            $errors[] = "Bank account number is required.";
        } else {
            if (isset($seenBankAccounts[$bankAcc])) {
                $errors[] = "Duplicate bank_account_number within this file.";
            }
            $seenBankAccounts[$bankAcc] = true;

            $bankHash = hash('sha256', $bankAcc);
            if (isset($existingBankHashes[$bankHash])) {
                $errors[] = "This bank account is already registered to another employee.";
            }
        }

        // 5. Statutory Inheritance & Fallbacks
        $pfApplicable = filter_var($normalizedRow['pf_applicable'] ?? ($client ? $client->pf_applicable : false), FILTER_VALIDATE_BOOLEAN);
        $epsApplicable = filter_var($normalizedRow['eps_applicable'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $rawVpf = $normalizedRow['vpf_enabled'] ?? $normalizedRow['vpf'] ?? null;
        $vpfEnabled = ($rawVpf !== null && $rawVpf !== '') ? filter_var($rawVpf, FILTER_VALIDATE_BOOLEAN) : false;
        $vpfType = !empty($normalizedRow['vpf_type']) ? strtolower(trim((string)$normalizedRow['vpf_type'])) : ($vpfEnabled ? 'percentage' : null);
        $vpfValue = (isset($normalizedRow['vpf_value']) && $normalizedRow['vpf_value'] !== '') ? (float)$normalizedRow['vpf_value'] : null;
        $esiApplicable = filter_var($normalizedRow['esi_applicable'] ?? ($client ? $client->esi_applicable : false), FILTER_VALIDATE_BOOLEAN);
        $ptApplicable = filter_var($normalizedRow['pt_applicable'] ?? ($client ? $client->pt_applicable : false), FILTER_VALIDATE_BOOLEAN);
        $lwfApplicable = filter_var($normalizedRow['lwf_applicable'] ?? ($client ? $client->lwf_applicable : false), FILTER_VALIDATE_BOOLEAN);
        $tdsApplicable = filter_var($normalizedRow['tds_applicable'] ?? ($client ? $client->tds_applicable : false), FILTER_VALIDATE_BOOLEAN);

        // Required field validations
        if (empty($normalizedRow['full_name'])) $errors[] = "Full name is required.";
        if (empty($normalizedRow['personal_email'])) $errors[] = "Personal email is required.";
        if (empty($normalizedRow['phone_number'])) $errors[] = "Phone number is required.";
        if (empty($normalizedRow['date_of_birth'])) $errors[] = "Date of birth is required.";
        if (empty($normalizedRow['date_of_joining'])) $errors[] = "Date of joining is required.";
        if (empty($normalizedRow['designation'])) $errors[] = "Designation is required.";
        if (empty($normalizedRow['residential_address'])) $errors[] = "Residential address is required.";
        if (empty($normalizedRow['bank_account_number'])) $errors[] = "Bank account number is required.";
        if (empty($normalizedRow['bank_ifsc'])) $errors[] = "Bank IFSC is required.";
        if (empty($normalizedRow['account_holder_name'])) $errors[] = "Account holder name is required.";
        if (empty($normalizedRow['pan_number'])) $errors[] = "PAN number is required.";

        // Reporting Manager Resolution (Supports reporting_manager_code, reporting_to, reporting_manager_id)
        $reportingManagerId = null;
        $rawManagerVal = $normalizedRow['reporting_manager_code'] 
            ?? $normalizedRow['reporting_to'] 
            ?? $normalizedRow['reporting_manager_id'] 
            ?? $normalizedRow['reporting_manager'] 
            ?? null;

        if (!empty($rawManagerVal)) {
            $managerCodeStr = trim((string)$rawManagerVal);
            $manager = $allManagers->get($managerCodeStr);

            if (!$manager && is_numeric($managerCodeStr)) {
                $manager = $allManagers->first(fn($m) => (int)$m->id === (int)$managerCodeStr);
            }

            if ($manager) {
                if ($client && $manager->client_id !== $client->id) {
                    $managerClient = $allClients->first(fn($c) => $c->id === $manager->client_id);
                    $managerClientName = $managerClient ? $managerClient->company_name : 'Unknown';
                    $warnings[] = "Reporting manager '{$managerCodeStr}' belongs to a different client ('{$managerClientName}'). Assigned reporting_manager_id set to null.";
                    $reportingManagerId = null;
                } else {
                    $reportingManagerId = $manager->id;
                }
            } else {
                $warnings[] = "Reporting manager '{$managerCodeStr}' not found in active employees. Field left unassigned.";
                $reportingManagerId = null;
            }
        }

        $rawEmpModel = strtolower(trim((string)($normalizedRow['employment_model'] ?? '')));
        if (empty($rawEmpModel)) {
            $employmentModel = ($client && $client->contract_type === 'agency') ? 'agency_contract' : 'eor';
        } else {
            if (in_array($rawEmpModel, ['agency', 'agency_contract', 'agency payroll', 'staffing', 'agency_payroll'], true)) {
                $employmentModel = 'agency_contract';
            } elseif (in_array($rawEmpModel, ['eor', 'pass_through', 'pass-through', 'pass through'], true)) {
                $employmentModel = 'eor';
            } else {
                $employmentModel = $rawEmpModel;
            }
        }

        if ($client) {
            $clientContractType = $client->contract_type ?? 'eor';
            if ($clientContractType === 'agency' && $employmentModel === 'eor') {
                $errors[] = "Employment model 'eor' is invalid for client '{$client->company_name}' which is configured under Agency Payroll (agency). Must be 'agency_contract'.";
            } elseif ($clientContractType === 'eor' && $employmentModel === 'agency_contract') {
                $errors[] = "Employment model 'agency_contract' is invalid for client '{$client->company_name}' which is configured under Pass-through EOR (eor). Must be 'eor'.";
            }
        }

        $rawDisabled = $normalizedRow['is_disabled'] ?? $normalizedRow['disabled'] ?? null;
        $isDisabled = filter_var($rawDisabled, FILTER_VALIDATE_BOOLEAN);

        $rawDisabilityPct = $normalizedRow['disability_percentage'] ?? null;
        $disabilityPercentage = null;
        if ($rawDisabilityPct !== null && $rawDisabilityPct !== '') {
            $parsedPct = filter_var($rawDisabilityPct, FILTER_VALIDATE_INT);
            if ($parsedPct === false || $parsedPct < 40 || $parsedPct > 100) {
                $errors[] = "The disability percentage must be between 40 and 100 under the RPwD Act, 2016.";
            } else {
                $disabilityPercentage = $parsedPct;
            }
        }

        $dob = $this->formatExcelDate($normalizedRow['date_of_birth'] ?? null);
        $doj = $this->formatExcelDate($normalizedRow['date_of_joining'] ?? null);
        $probationEndDate = $this->formatExcelDate($normalizedRow['probation_end_date'] ?? null);
        $attendanceTrackingStartDate = $this->formatExcelDate($normalizedRow['attendance_tracking_start_date'] ?? null) ?: $doj;
        $esiPeriodEnd = $this->formatExcelDate($normalizedRow['esi_contribution_period_end'] ?? null);

        $rawDesigStr = trim((string)($normalizedRow['designation'] ?? ''));
        $desigMaster = null;
        if (!empty($rawDesigStr)) {
            $desigMaster = \App\Models\Masters\MasDesignation::where('name', $rawDesigStr)->first();
            if (!$desigMaster) {
                $maxSort = (int)(\App\Models\Masters\MasDesignation::max('sort_order') ?? 0) + 1;
                $desigMaster = \App\Models\Masters\MasDesignation::create([
                    'name' => $rawDesigStr,
                    'department_name' => 'General',
                    'is_active' => true,
                    'sort_order' => $maxSort,
                ]);
            }
        }

        $validationData = array_merge($normalizedRow, [
            'client_id' => $client ? $client->id : null,
            'branch_id' => $branchId ?: ($client && $client->branches->first() ? $client->branches->first()->id : 1),
            'designation_id' => $desigMaster ? $desigMaster->id : null,
            'designation' => $rawDesigStr,
            'date_of_birth' => $dob,
            'date_of_joining' => $doj,
            'employment_model' => $employmentModel,
            'is_disabled' => $isDisabled,
            'disability_percentage' => $disabilityPercentage,
            'pf_applicable' => $pfApplicable,
            'eps_applicable' => $epsApplicable,
            'vpf_enabled' => $vpfEnabled,
            'vpf_type' => $vpfType,
            'vpf_value' => $vpfValue,
            'esi_applicable' => $esiApplicable,
            'pt_applicable' => $ptApplicable,
            'lwf_applicable' => $lwfApplicable,
            'tds_applicable' => $tdsApplicable,
            'bonus_toggle' => filter_var($normalizedRow['bonus_toggle'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'tds_regime' => $normalizedRow['tds_regime'] ?? 'new',
            'gratuity_mode' => $normalizedRow['gratuity_mode'] ?? 'part_of_ctc',
            'lop_basis_days' => '30',
            'bank_name' => $normalizedRow['bank_name'] ?? '',
            'bank_branch' => $normalizedRow['bank_branch'] ?? '',
            'uan_mode' => in_array(strtolower(trim((string)($normalizedRow['uan_mode'] ?? ''))), ['new', 'existing_transfer'], true) ? strtolower(trim((string)$normalizedRow['uan_mode'])) : 'new',
            'esi_mode' => $normalizedRow['esi_mode'] ?? 'new',
            'declarations_accepted' => true,
            'reporting_manager_id' => (!empty($reportingManagerId) && is_numeric($reportingManagerId) && (int)$reportingManagerId > 0) ? (int)$reportingManagerId : null,
            'probation_end_date' => $probationEndDate,
            'attendance_tracking_start_date' => $attendanceTrackingStartDate,
            'esi_contribution_period_end' => $esiPeriodEnd,
        ]);

        $salaryPreview = null;
        $basic = $validationData['basic_pay'] ?? null;
        $hra = $validationData['hra'] ?? null;
        if (is_numeric($basic) && is_numeric($hra)) {
            $salaryKey = md5(json_encode([
                $basic, $hra,
                $validationData['conveyance'] ?? 0,
                $validationData['da'] ?? 0,
                $validationData['medical_allowance'] ?? 0,
                $validationData['special_allowance'] ?? 0,
                $validationData['other_additions'] ?? 0,
                $isDisabled,
                $pfApplicable, $epsApplicable, $vpfEnabled, $vpfType, $vpfValue, $esiApplicable, $ptApplicable, $lwfApplicable, $tdsApplicable,
                $validationData['date_of_birth'] ?? '', $validationData['date_of_joining'] ?? ''
            ]));

            if (isset($this->salaryCache[$salaryKey])) {
                $salaryPreview = $this->salaryCache[$salaryKey];
            } else {
                try {
                    $salaryPreview = $this->salaryService->calculateStructuralSalary($validationData);
                    $this->salaryCache[$salaryKey] = $salaryPreview;
                } catch (\Exception $e) {}
            }
        }

        $status = 'ready';
        if (!empty($errors)) {
            $status = 'error';
            $results['error_count']++;
        } else {
            if (!empty($warnings)) {
                $status = 'warning';
                $results['warning_count']++;
            }
            $results['valid_count']++;
        }

        $messages = array_merge($errors, $warnings);
        if (empty($messages) && $status === 'ready') {
            $messages[] = 'Data format ready';
        }

        $dbPayload = null;
        if ($status !== 'error') {
            $dbPayload = $validationData;
            $currentUserId = \Illuminate\Support\Facades\Auth::id();
            $validUserId = ($currentUserId && DB::table('users')->where('id', $currentUserId)->exists()) ? $currentUserId : null;
            $dbPayload['created_by'] = $validUserId;
            $dbPayload['updated_by'] = $validUserId;
            $dbPayload['client_id'] = $client ? $client->id : null;
            $dbPayload['branch_id'] = $branchId;
            $dbPayload['status'] = 'onboarding';
            $dbPayload['entry_source'] = 'bulk_upload';
            $dbPayload['notice_period_days'] = $validationData['notice_period_days'] ?? 30;

            $dbPayload['gross_monthly_salary'] = $salaryPreview['gross_monthly_salary'] ?? 0;
            $dbPayload['net_take_home_monthly'] = $salaryPreview['net_take_home_monthly'] ?? 0;
            $dbPayload['employer_pf_monthly'] = $salaryPreview['employer_pf_monthly'] ?? 0;
            $dbPayload['employer_esi_monthly'] = $salaryPreview['employer_esi_monthly'] ?? 0;
            $dbPayload['ctc_monthly'] = $salaryPreview['ctc_monthly'] ?? 0;

            $dbPayload['conveyance'] = (float)($validationData['conveyance'] ?? 0);
            $dbPayload['da'] = (float)($validationData['da'] ?? 0);
            $dbPayload['medical_allowance'] = (float)($validationData['medical_allowance'] ?? 0);
            $dbPayload['special_allowance'] = (float)($validationData['special_allowance'] ?? 0);
            $dbPayload['other_additions'] = (float)($validationData['other_additions'] ?? 0);
            $dbPayload['bank_branch'] = $validationData['bank_branch'] ?? '';

            $dbPayload['bank_account_hash'] = $bankHash;
            $dbPayload['pan_number_hash'] = $panHash;
            $dbPayload['aadhaar_number_hash'] = $aadhaarHash;

            if (isset($dbPayload['bank_account_number'])) {
                $dbPayload['bank_account_number'] = $this->fastEncrypt($dbPayload['bank_account_number']);
            }
            if (isset($dbPayload['pan_number'])) {
                $dbPayload['pan_number'] = $this->fastEncrypt($dbPayload['pan_number']);
            }
            if (!empty($dbPayload['aadhaar_number'])) {
                $dbPayload['aadhaar_number'] = $this->fastEncrypt($dbPayload['aadhaar_number']);
            }

            unset($dbPayload['client_code'], $dbPayload['branch_name'], $dbPayload['branch_code'], $dbPayload['reporting_manager_code'], $dbPayload['reporting_to'], $dbPayload['reporting_manager']);

            // Safely filter $dbPayload to contain ONLY valid columns in the employees table
            static $validEmployeeColumns = null;
            if ($validEmployeeColumns === null) {
                $validEmployeeColumns = array_fill_keys(\Illuminate\Support\Facades\Schema::getColumnListing('employees'), true);
            }
            $dbPayload = array_intersect_key($dbPayload, $validEmployeeColumns);
        }

        $rowData = [
            'rowNo' => $rowIndex,
            'empCode' => $normalizedRow['employee_code'] ?? '—',
            'empName' => $normalizedRow['full_name'] ?? '—',
            'client' => $client ? $client->company_name : ($clientCode ?? '—'),
            'ctc' => $salaryPreview ? $salaryPreview['ctc_monthly'] : null,
            'message' => implode(' | ', $messages),
            'status' => $status,
            'raw_data' => $normalizedRow,
            'statutory' => [
                'pf' => $pfApplicable,
                'esi' => $esiApplicable,
                'pt' => $ptApplicable,
                'lwf' => $lwfApplicable,
                'tds' => $tdsApplicable,
            ]
        ];
        if ($dbPayload) {
            $rowData['db_payload'] = $dbPayload;
        }

        // Include all validated rows in results array for complete table pagination
        $results['rows'][] = $rowData;
        $results['total_rows']++;

        if ($progressCallback && ($results['total_rows'] % 200 === 0)) {
            $progressCallback($results['total_rows'], $results['valid_count'], $results['error_count'], $results['warning_count']);
        }

        $stagingChunks[] = [
            'batch_id' => $batchId,
            'row_no' => $rowIndex,
            'employee_code' => $empCode,
            'client_code' => $clientCode,
            'client_id' => $client ? $client->id : null,
            'branch_id' => $branchId,
            'full_name' => $normalizedRow['full_name'] ?? null,
            'personal_email' => $email,
            'phone_number' => $phone,
            'bank_account_number' => $dbPayload['bank_account_number'] ?? null,
            'bank_account_hash' => $bankHash,
            'pan_number' => $dbPayload['pan_number'] ?? null,
            'pan_number_hash' => $panHash,
            'aadhaar_number' => $dbPayload['aadhaar_number'] ?? null,
            'aadhaar_number_hash' => $aadhaarHash,
            'raw_data' => json_encode($normalizedRow),
            'db_payload' => $dbPayload ? json_encode($dbPayload) : null,
            'status' => $status,
            'error_message' => implode(' | ', $errors),
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if (count($stagingChunks) >= 100) {
            DB::table('bulk_upload_staging_rows')->insert($stagingChunks);
            $stagingChunks = [];
        }
    }

    protected function normalizeChunkKeys(array $chunk): array
    {
        if (empty($chunk)) return [];

        $allKeys = [];
        foreach ($chunk as $row) {
            foreach ($row as $k => $v) {
                $allKeys[$k] = true;
            }
        }
        $keysList = array_keys($allKeys);
        sort($keysList);

        $normalizedChunk = [];
        foreach ($chunk as $row) {
            $normalizedRow = [];
            foreach ($keysList as $k) {
                $normalizedRow[$k] = array_key_exists($k, $row) ? $row[$k] : null;
            }
            $normalizedChunk[] = $normalizedRow;
        }
        return $normalizedChunk;
    }

    public function executeBatchImport($batchId, $userId = null)
    {
        $now = now()->toDateTimeString();
        $importedCount = 0;
        $clientImpacts = [];
        $clientIds = [];
        $importedEmpCodes = [];

        DB::beginTransaction();

        try {
            $stagingQuery = DB::table('bulk_upload_staging_rows')
                ->where('batch_id', $batchId)
                ->where('status', '!=', 'error');

            $stagingRows = $stagingQuery->get();

            $chunk = [];
            foreach ($stagingRows as $row) {
                if (empty($row->db_payload)) {
                    continue;
                }

                $dbPayload = json_decode($row->db_payload, true);
                if (empty($dbPayload)) {
                    continue;
                }

                $dbPayload['created_at'] = $now;
                $dbPayload['updated_at'] = $now;
                $dbPayload['entry_source'] = 'bulk_upload';
                $effectiveUserId = null;
                if ($userId && DB::table('users')->where('id', $userId)->exists()) {
                    $effectiveUserId = $userId;
                } elseif (!empty($dbPayload['created_by']) && DB::table('users')->where('id', $dbPayload['created_by'])->exists()) {
                    $effectiveUserId = $dbPayload['created_by'];
                }

                $dbPayload['created_by'] = $effectiveUserId;
                $dbPayload['updated_by'] = $effectiveUserId;

                foreach ($dbPayload as $k => $v) {
                    if (is_bool($v)) {
                        $dbPayload[$k] = $v ? 1 : 0;
                    } elseif (is_string($v) && in_array(strtolower(trim($v)), ['true', 'false'], true)) {
                        $dbPayload[$k] = strtolower(trim($v)) === 'true' ? 1 : 0;
                    }
                }

                $importedEmpCodes[] = $dbPayload['employee_code'];
                $chunk[] = $dbPayload;
                $importedCount++;

                $clientId = $dbPayload['client_id'] ?? null;
                if ($clientId) {
                    $clientIds[$clientId] = true;
                    if (!isset($clientImpacts[$clientId])) {
                        $clientImpacts[$clientId] = [
                            'client_name' => $row->client_code,
                            'employee_count' => 0,
                            'total_ctc' => 0,
                        ];
                    }
                    $clientImpacts[$clientId]['employee_count']++;
                    $clientImpacts[$clientId]['total_ctc'] += $dbPayload['ctc_monthly'] ?? 0;
                }

                if (count($chunk) >= 100) {
                    $normChunk = $this->normalizeChunkKeys($chunk);
                    $updateCols = array_keys($normChunk[0]);
                    DB::table('employees')->upsert($normChunk, ['employee_code'], $updateCols);
                    $chunk = [];
                }
            }

            if (!empty($chunk)) {
                $normChunk = $this->normalizeChunkKeys($chunk);
                $updateCols = array_keys($normChunk[0]);
                DB::table('employees')->upsert($normChunk, ['employee_code'], $updateCols);
                $chunk = [];
            }

            DB::commit();

            // Clean staging table for batch
            // DB::table('bulk_upload_staging_rows')->where('batch_id', $batchId)->delete();

            $employeeIds = Employee::whereIn('employee_code', $importedEmpCodes)->pluck('id')->all();

            return [
                'success' => true,
                'imported_count' => $importedCount,
                'employee_ids' => $employeeIds,
                'client_impacts' => array_values($clientImpacts),
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    protected function colLetterToIdx(string $cellRef): int
    {
        preg_match('/^([A-Z]+)/i', $cellRef, $matches);
        if (empty($matches[1])) return 0;
        $str = strtoupper($matches[1]);
        $len = strlen($str);
        $idx = 0;
        for ($i = 0; $i < $len; $i++) {
            $idx = $idx * 26 + (ord($str[$i]) - 64);
        }
        return $idx - 1;
    }

    protected function parseXlsxFast(string $filePath): array
    {
        if (!class_exists('ZipArchive') || !class_exists('XMLReader')) {
            return [];
        }

        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return [];
        }

        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $xmlReader = new \XMLReader();
            $xmlReader->XML($sharedStringsXml);
            while ($xmlReader->read()) {
                if ($xmlReader->nodeType === \XMLReader::ELEMENT && $xmlReader->name === 't') {
                    $sharedStrings[] = $xmlReader->readString();
                }
            }
            $xmlReader->close();
        }

        $sheetPath = 'xl/worksheets/sheet1.xml';
        $workbookXml = $zip->getFromName('xl/workbook.xml');
        if ($workbookXml) {
            $xmlReader = new \XMLReader();
            $xmlReader->XML($workbookXml);
            $sheetIdx = 1;
            while ($xmlReader->read()) {
                if ($xmlReader->nodeType === \XMLReader::ELEMENT && $xmlReader->name === 'sheet') {
                    $name = $xmlReader->getAttribute('name');
                    if ($name === 'Employee Data') {
                        $sheetPath = 'xl/worksheets/sheet' . $sheetIdx . '.xml';
                        break;
                    }
                    $sheetIdx++;
                }
            }
            $xmlReader->close();
        }

        $sheetXml = $zip->getFromName($sheetPath);
        $zip->close();

        if (!$sheetXml) return [];

        $xmlReader = new \XMLReader();
        $xmlReader->XML($sheetXml);

        $rows = [];
        $currentRow = [];
        $currentCellType = null;
        $currentCellIdx = 0;
        $cellValue = null;
        $headerMap = [];
        $isHeader = true;

        while ($xmlReader->read()) {
            if ($xmlReader->nodeType === \XMLReader::ELEMENT) {
                if ($xmlReader->name === 'row') {
                    $currentRow = [];
                } elseif ($xmlReader->name === 'c') {
                    $rAttr = $xmlReader->getAttribute('r');
                    $currentCellIdx = $rAttr ? $this->colLetterToIdx($rAttr) : count($currentRow);
                    $currentCellType = $xmlReader->getAttribute('t');
                    $cellValue = '';
                } elseif ($xmlReader->name === 'v' || $xmlReader->name === 't') {
                    $val = $xmlReader->readString();
                    if ($currentCellType === 's' && isset($sharedStrings[(int)$val])) {
                        $val = $sharedStrings[(int)$val];
                    }
                    $cellValue = trim((string)$val);
                }
            } elseif ($xmlReader->nodeType === \XMLReader::END_ELEMENT) {
                if ($xmlReader->name === 'c') {
                    $currentRow[$currentCellIdx] = $cellValue ?? '';
                } elseif ($xmlReader->name === 'row') {
                    if (!empty($currentRow)) {
                        ksort($currentRow);
                        if ($isHeader) {
                            $headerMap = array_map(fn($h) => Str::snake(trim($h)), $currentRow);
                            $isHeader = false;
                        } else {
                            $assoc = [];
                            foreach ($currentRow as $colIdx => $val) {
                                $key = $headerMap[$colIdx] ?? 'col_' . $colIdx;
                                $assoc[$key] = $val;
                            }
                            $rows[] = $assoc;
                        }
                    }
                }
            }
        }
        $xmlReader->close();
        return $rows;
    }

    /**
     * Convert Excel serial numbers (e.g. 46235, 44927, 34834) or date strings into Y-m-d format.
     */
    protected function formatExcelDate($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $valStr = trim((string)$value);
        if ($valStr === '') {
            return null;
        }

        // 1. Handle numeric Excel Serial Date (e.g. 46235 -> 2026-08-01)
        if (is_numeric($valStr) && (float)$valStr > 1000 && (float)$valStr < 100000) {
            try {
                $excelEpoch = \Carbon\Carbon::create(1899, 12, 30);
                return $excelEpoch->addDays((int)$valStr)->format('Y-m-d');
            } catch (\Throwable $e) {
                return null;
            }
        }

        // 2. Handle standard date strings
        try {
            return \Carbon\Carbon::parse($valStr)->format('Y-m-d');
        } catch (\Throwable $e) {
            return $valStr;
        }
    }
}
