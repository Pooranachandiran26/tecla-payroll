<?php

namespace App\Services;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Spatie\SimpleExcel\SimpleExcelReader;
use App\Models\Client;
use App\Models\Employee;
use Illuminate\Support\Str;

class BulkUploadValidationService
{
    protected $salaryService;

    public function __construct(SalaryCalculationService $salaryService)
    {
        $this->salaryService = $salaryService;
    }

    public function validateFile($filePath)
    {
        @set_time_limit(600);
        @ini_set('memory_limit', '512M');
        $reader = SimpleExcelReader::create($filePath);
        
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if (in_array($extension, ['xlsx', 'xls'])) {
            if (method_exists($reader, 'hasSheet') && $reader->hasSheet('Employee Data')) {
                $reader->fromSheetName('Employee Data');
            }
        }
        
        $results = [
            'valid_count' => 0,
            'warning_count' => 0,
            'error_count' => 0,
            'total_rows' => 0,
            'rows' => []
        ];

        // Pre-fetch all DB uniqueness hashtables in single queries (O(1) lookup time)
        $existingEmpCodes = array_fill_keys(Employee::pluck('employee_code')->filter()->all(), true);
        $existingEmails = array_fill_keys(Employee::pluck('personal_email')->filter()->all(), true);
        $existingUserEmails = array_fill_keys(\App\Models\User::pluck('email')->filter()->all(), true);
        $existingPhones = array_fill_keys(Employee::pluck('phone_number')->filter()->all(), true);
        $existingBankHashes = array_fill_keys(Employee::whereNotNull('bank_account_hash')->pluck('bank_account_hash')->filter()->all(), true);
        $existingPanHashes = array_fill_keys(Employee::whereNotNull('pan_number_hash')->pluck('pan_number_hash')->filter()->all(), true);
        $existingAadhaarHashes = array_fill_keys(Employee::whereNotNull('aadhaar_number_hash')->pluck('aadhaar_number_hash')->filter()->all(), true);

        // Pre-fetch all clients and managers
        $allClients = Client::with('branches')->get()->keyBy('client_code');
        $allManagers = Employee::select('id', 'employee_code', 'client_id')->get()->keyBy('employee_code');

        $seenEmails = [];
        $seenPhones = [];
        $seenPans = [];
        $seenAadhaars = [];
        $seenBankAccounts = [];
        $seenEmpCodes = [];

        $rowIndex = 1; // Header is usually row 1 in Excel terms, so data starts at row 2, but we'll use a simple counter.

        $reader->getRows()->each(function(array $row) use (
            &$results, &$seenEmpCodes, &$seenEmails, &$seenPhones, &$seenPans, &$seenAadhaars, &$seenBankAccounts,
            $existingEmpCodes, $existingEmails, $existingUserEmails, $existingPhones,
            $existingBankHashes, $existingPanHashes, $existingAadhaarHashes,
            $allClients, $allManagers, &$rowIndex
        ) {
            $rowIndex++;
            
            // Normalize keys to snake_case just in case they have spaces
            $normalizedRow = [];
            foreach ($row as $key => $value) {
                $normalizedRow[Str::snake(trim($key))] = trim($value);
            }

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
                        $matchedBranch = $branches->first(function($b) use ($branchCodeOrName) {
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
            if ($email) {
                if (isset($seenEmails[$email])) {
                    $errors[] = "Duplicate personal_email within this file.";
                }
                $seenEmails[$email] = true;

                if (isset($existingEmails[$email]) || isset($existingUserEmails[$email])) {
                    $errors[] = "The personal email has already been taken.";
                }
            }

            $phone = $normalizedRow['phone_number'] ?? null;
            if ($phone) {
                if (isset($seenPhones[$phone])) {
                    $errors[] = "Duplicate phone_number within this file.";
                }
                $seenPhones[$phone] = true;

                if (isset($existingPhones[$phone])) {
                    $errors[] = "The phone number has already been taken.";
                }
            }

            $pan = $normalizedRow['pan_number'] ?? null;
            if ($pan) {
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
            if ($bankAcc) {
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
            $pfApplicable = $normalizedRow['pf_applicable'] ?? null;
            if ($pfApplicable === null || $pfApplicable === '') {
                $pfApplicable = $client ? $client->pf_applicable : false;
            } else {
                $pfApplicable = filter_var($pfApplicable, FILTER_VALIDATE_BOOLEAN);
            }

            $epsApplicable = $normalizedRow['eps_applicable'] ?? null;
            if ($epsApplicable === null || $epsApplicable === '') {
                $epsApplicable = true; // Default true matching single-employee form and legacy 39-column files
            } else {
                $epsApplicable = filter_var($epsApplicable, FILTER_VALIDATE_BOOLEAN);
            }

            $esiApplicable = $normalizedRow['esi_applicable'] ?? null;
            if ($esiApplicable === null || $esiApplicable === '') {
                $esiApplicable = $client ? $client->esi_applicable : false;
            } else {
                $esiApplicable = filter_var($esiApplicable, FILTER_VALIDATE_BOOLEAN);
            }

            $ptApplicable = $normalizedRow['pt_applicable'] ?? null;
            if ($ptApplicable === null || $ptApplicable === '') {
                $ptApplicable = $client ? $client->pt_applicable : false;
            } else {
                $ptApplicable = filter_var($ptApplicable, FILTER_VALIDATE_BOOLEAN);
            }

            $lwfApplicable = $normalizedRow['lwf_applicable'] ?? null;
            if ($lwfApplicable === null || $lwfApplicable === '') {
                $lwfApplicable = $client ? $client->lwf_applicable : false;
            } else {
                $lwfApplicable = filter_var($lwfApplicable, FILTER_VALIDATE_BOOLEAN);
            }

            $tdsApplicable = $normalizedRow['tds_applicable'] ?? null;
            if ($tdsApplicable === null || $tdsApplicable === '') {
                $tdsApplicable = $client ? $client->tds_applicable : false;
            } else {
                $tdsApplicable = filter_var($tdsApplicable, FILTER_VALIDATE_BOOLEAN);
            }

            $bonusToggle = $normalizedRow['bonus_toggle'] ?? null;
            if ($bonusToggle === null || $bonusToggle === '') {
                $bonusToggle = false;
            } else {
                $bonusToggle = filter_var($bonusToggle, FILTER_VALIDATE_BOOLEAN);
            }

            $tdsRegime = $normalizedRow['tds_regime'] ?? 'new';
            $gratuityMode = $normalizedRow['gratuity_mode'] ?? 'part_of_ctc';
            $lopBasisDays = '30';

            // Normalize declarations_accepted boolean (yes/no/true/false/1/0 string support, default to true)
            $rawDecl = $normalizedRow['declarations_accepted'] ?? null;
            if ($rawDecl === null || $rawDecl === '') {
                $declarationsAccepted = true; // Default to true (accepted) matching single-employee form
            } else {
                $strDecl = strtolower(trim((string)$rawDecl));
                if (in_array($strDecl, ['yes', 'true', '1'], true)) {
                    $declarationsAccepted = true;
                } elseif (in_array($strDecl, ['no', 'false', '0'], true)) {
                    $declarationsAccepted = false;
                } else {
                    $declarationsAccepted = filter_var($rawDecl, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
                }
            }

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
                if ($client) {
                    $employmentModel = ($client->contract_type === 'agency') ? 'agency_contract' : 'eor';
                } else {
                    $employmentModel = 'eor';
                }
            } else {
                if (in_array($rawEmpModel, ['agency', 'agency_contract', 'agency payroll', 'staffing', 'agency_payroll'], true)) {
                    $employmentModel = 'agency_contract';
                } elseif (in_array($rawEmpModel, ['eor', 'pass_through', 'pass-through', 'pass through'], true)) {
                    $employmentModel = 'eor';
                } else {
                    $employmentModel = $rawEmpModel;
                }
            }

            // Client Contract Type Mismatch Enforcement
            if ($client) {
                $clientContractType = $client->contract_type ?? 'eor';
                if ($clientContractType === 'agency' && $employmentModel === 'eor') {
                    $errors[] = "Employment model 'eor' is invalid for client '{$client->company_name}' which is configured under Agency Payroll (agency). Must be 'agency_contract'.";
                } elseif ($clientContractType === 'eor' && $employmentModel === 'agency_contract') {
                    $errors[] = "Employment model 'agency_contract' is invalid for client '{$client->company_name}' which is configured under Pass-through EOR (eor). Must be 'eor'.";
                }
            }

            $dob = $this->formatExcelDate($normalizedRow['date_of_birth'] ?? null);
            $doj = $this->formatExcelDate($normalizedRow['date_of_joining'] ?? null);
            $probationEndDate = $this->formatExcelDate($normalizedRow['probation_end_date'] ?? null);
            $attendanceTrackingStartDate = $this->formatExcelDate($normalizedRow['attendance_tracking_start_date'] ?? null) ?: $doj;
            $esiPeriodEnd = $this->formatExcelDate($normalizedRow['esi_contribution_period_end'] ?? null);

            $healthInsuranceProvider = !empty($normalizedRow['health_insurance_provider']) ? trim($normalizedRow['health_insurance_provider']) : null;
            $healthInsurancePolicyNo = !empty($normalizedRow['health_insurance_policy_no']) ? trim($normalizedRow['health_insurance_policy_no']) : null;
            $healthInsuranceSumInsured = (isset($normalizedRow['health_insurance_sum_insured']) && $normalizedRow['health_insurance_sum_insured'] !== '') 
                ? (float)$normalizedRow['health_insurance_sum_insured'] 
                : null;

            $rawDisabled = $normalizedRow['is_disabled'] ?? $normalizedRow['disabled'] ?? null;
            $isDisabled = filter_var($rawDisabled, FILTER_VALIDATE_BOOLEAN);
            $disabilityType = !empty($normalizedRow['disability_type']) ? trim($normalizedRow['disability_type']) : null;
            $disabilityPercentage = (isset($normalizedRow['disability_percentage']) && $normalizedRow['disability_percentage'] !== '') ? (int)$normalizedRow['disability_percentage'] : null;
            $udidCardNumber = !empty($normalizedRow['udid_card_number']) ? trim($normalizedRow['udid_card_number']) : null;

            $validationData = array_merge($normalizedRow, [
                'client_id' => $client ? $client->id : null,
                'branch_id' => $branchId ?: ($client && $client->branches->first() ? $client->branches->first()->id : 1),
                'date_of_birth' => $dob,
                'date_of_joining' => $doj,
                'employment_model' => $employmentModel,
                'is_disabled' => $isDisabled,
                'disability_type' => $disabilityType,
                'disability_percentage' => $disabilityPercentage,
                'udid_card_number' => $udidCardNumber,
                'pf_applicable' => $pfApplicable,
                'eps_applicable' => $epsApplicable,
                'esi_applicable' => $esiApplicable,
                'pt_applicable' => $ptApplicable,
                'lwf_applicable' => $lwfApplicable,
                'tds_applicable' => $tdsApplicable,
                'bonus_toggle' => $bonusToggle,
                'tds_regime' => $tdsRegime,
                'gratuity_mode' => $gratuityMode,
                'lop_basis_days' => $lopBasisDays,
                'bank_name' => $normalizedRow['bank_name'] ?? '',
                'bank_branch' => $normalizedRow['bank_branch'] ?? '',
                'uan_mode' => $normalizedRow['uan_mode'] ?? 'new',
                'esi_mode' => $normalizedRow['esi_mode'] ?? 'new',
                'declarations_accepted' => $declarationsAccepted,
                'reporting_manager_id' => (!empty($reportingManagerId) && is_numeric($reportingManagerId) && (int)$reportingManagerId > 0) ? (int)$reportingManagerId : null,
                'emergency_contact_name' => $normalizedRow['emergency_contact_name'] ?? null,
                'previous_employer_name' => $normalizedRow['previous_employer_name'] ?? null,
                'previous_employer_uan' => $normalizedRow['previous_employer_uan'] ?? null,
                'probation_end_date' => $probationEndDate,
                'attendance_tracking_start_date' => $attendanceTrackingStartDate,
                'health_insurance_provider' => $healthInsuranceProvider,
                'health_insurance_policy_no' => $healthInsurancePolicyNo,
                'health_insurance_sum_insured' => $healthInsuranceSumInsured,
                'esi_contribution_period_end' => $esiPeriodEnd,
            ]);

            $rules = [
                'full_name' => 'required|string|max:255',
                'personal_email' => 'required|email',
                'phone_number' => 'required|string|max:15',
                'emergency_contact_name' => 'nullable|string|max:255',
                'emergency_contact_phone' => 'nullable|string|max:15',
                'date_of_birth' => 'required|date',
                'date_of_joining' => 'required|date',
                'attendance_tracking_start_date' => 'nullable|date',
                'designation' => 'required|string|max:255',
                'gender' => 'nullable|in:male,female,other',
                'is_disabled' => 'nullable|boolean',
                'disability_type' => 'nullable|string|max:50',
                'disability_percentage' => 'nullable|integer|min:40|max:100',
                'udid_card_number' => 'nullable|string|max:50',
                'blood_group' => 'nullable|string|max:10',
                'marital_status' => 'nullable|in:single,married,other',
                'employment_model' => 'required|in:eor,agency_contract',
                'prior_employment_flag' => 'required|boolean',
                'previous_employer_name' => 'nullable|string|max:255',
                'previous_employer_uan' => 'nullable|digits:12',
                'probation_end_date' => 'nullable|date',
                'esi_contribution_period_end' => 'nullable|date',
                'declarations_accepted' => 'required|boolean',
                'residential_address' => 'required|string',
                
                // Banking
                'bank_account_number' => 'required|string',
                'bank_ifsc' => 'required|string|regex:/^[A-Z]{4}0[A-Z0-9]{6}$/',
                'bank_name' => 'nullable|string',
                'bank_branch' => 'nullable|string',
                'account_holder_name' => 'required|string|max:255',
                
                // Identity
                'pan_number' => 'required|string|regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/',
                'aadhaar_number' => 'nullable|string',
                
                // Statutory
                'uan_mode' => 'nullable|in:new,existing_transfer',
                'uan_number' => [
                    'nullable',
                    'digits:12',
                    Rule::requiredIf(fn() => $pfApplicable && ($validationData['uan_mode'] ?? 'new') === 'existing_transfer')
                ],
                'esi_mode' => 'nullable|in:new,existing_transfer',
                'esic_number' => [
                    'nullable',
                    'digits:10',
                    Rule::requiredIf(fn() => $esiApplicable && ($validationData['esi_mode'] ?? 'new') === 'existing_transfer')
                ],
                'tds_regime' => 'required|in:old,new',
                'gratuity_mode' => 'required|in:part_of_ctc,over_and_above',
                'lop_basis_days' => 'required|integer|min:15|max:31',
                
                // Salary
                'basic_pay' => 'required|numeric|min:0',
                'hra' => 'required|numeric|min:0',
                'conveyance' => 'required|numeric|min:0',
                'da' => 'required|numeric|min:0',
                'medical_allowance' => 'required|numeric|min:0',
                'special_allowance' => 'required|numeric|min:0',
                'other_additions' => 'required|numeric|min:0',
                'pt_deduction_override' => 'nullable|numeric|min:0',
            ];

            // Normalize booleans for validator
            $validationData['prior_employment_flag'] = filter_var($validationData['prior_employment_flag'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $validator = Validator::make($validationData, $rules);

            if ($validator->fails()) {
                foreach ($validator->errors()->all() as $msg) {
                    $errors[] = $msg;
                }
            }

            // DOB 18+ validation
            if (!empty($validationData['date_of_birth']) && !empty($validationData['date_of_joining'])) {
                try {
                    $dob = new \DateTime($validationData['date_of_birth']);
                    $doj = new \DateTime($validationData['date_of_joining']);
                    $age = $dob->diff($doj)->y;
                    if ($age < 18) {
                        $errors[] = 'Employee must be at least 18 years old at the Date of Joining.';
                    }
                } catch (\Exception $e) {
                    $errors[] = 'Invalid date format for DOB or DOJ.';
                }
            }

            // Probation end date validation (must be on or after Date of Joining)
            if (!empty($validationData['probation_end_date']) && !empty($validationData['date_of_joining'])) {
                try {
                    $probationDate = new \DateTime($validationData['probation_end_date']);
                    $doj = new \DateTime($validationData['date_of_joining']);
                    if ($probationDate < $doj) {
                        $errors[] = 'Probation end date cannot precede Date of Joining.';
                    }
                } catch (\Exception $e) {
                    $errors[] = 'Invalid date format for probation_end_date.';
                }
            }

            // Age 58+ preview warning
            if (!empty($validationData['date_of_birth']) && $pfApplicable) {
                try {
                    $dobDate = new \DateTime($validationData['date_of_birth']);
                    $calcRef = !empty($validationData['date_of_joining']) ? new \DateTime($validationData['date_of_joining']) : new \DateTime();
                    $ageYears = $dobDate->diff($calcRef)->y;
                    if ($ageYears >= 58) {
                        $warnings[] = 'EPS auto-cut off to ₹0 (age 58+)';
                    }
                } catch (\Exception $e) {}
            }

            // 7. Salary Calculation Preview
            $salaryPreview = null;
            if (is_numeric($validationData['basic_pay'] ?? null) && is_numeric($validationData['hra'] ?? null)) {
                try {
                    $salaryPreview = $this->salaryService->calculateStructuralSalary($validationData);
                    
                    // 8. Wage Code Warning
                    $basic = $validationData['basic_pay'] ?? 0;
                    $ctc = $salaryPreview['ctc_monthly'] ?? 0;
                    if ($ctc > 0 && $basic < ($ctc * 0.5)) {
                        $warnings[] = "Basic pay ($basic) is less than 50% of CTC ($ctc) (Wage Code Warning).";
                    }

                    // 9. Non-ESI missing Group Medical Insurance warning
                    $grossPay = $salaryPreview['gross_monthly_salary'] ?? 0;
                    $esiCeiling = $isDisabled ? \App\Services\SalaryCalculationService::ESI_DISABILITY_WAGE_CEILING : \App\Services\SalaryCalculationService::ESI_WAGE_CEILING;
                    $isEsiActive = $esiApplicable && ($grossPay <= $esiCeiling);
                    $clientInsuranceEnabled = $client ? ($client->health_insurance_enabled !== false) : true;

                    if (!$isEsiActive && $clientInsuranceEnabled) {
                        if (empty($healthInsuranceProvider) && empty($healthInsurancePolicyNo)) {
                            $warnings[] = 'Non-ESI member without Group Medical Insurance details.';
                        }
                    }
                } catch (\Exception $e) {
                    // Ignore salary calculation errors for the preview if inputs were weird
                }
            }

            // Summarize status
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

            if ($status !== 'error') {
                $dbPayload = $validationData;
                $dbPayload['client_id'] = $client ? $client->id : null;
                $dbPayload['branch_id'] = $branchId;
                $dbPayload['status'] = 'onboarding'; // same as manual creation
                $dbPayload['entry_source'] = 'bulk_upload';
                
                $dbPayload['gross_monthly_salary'] = $salaryPreview['gross_monthly_salary'] ?? 0;
                $dbPayload['net_take_home_monthly'] = $salaryPreview['net_take_home_monthly'] ?? 0;
                $dbPayload['employer_pf_monthly'] = $salaryPreview['employer_pf_monthly'] ?? 0;
                $dbPayload['employer_esi_monthly'] = $salaryPreview['employer_esi_monthly'] ?? 0;
                $dbPayload['ctc_monthly'] = $salaryPreview['ctc_monthly'] ?? 0;

                $dbPayload['bank_account_hash'] = hash('sha256', (string)($dbPayload['bank_account_number'] ?? ''));
                $dbPayload['pan_number_hash'] = hash('sha256', (string)($dbPayload['pan_number'] ?? ''));
                if (!empty($dbPayload['aadhaar_number'])) {
                    $dbPayload['aadhaar_number_hash'] = hash('sha256', (string)$dbPayload['aadhaar_number']);
                }

                // Remove non-employee table fields
                unset($dbPayload['client_code'], $dbPayload['branch_name'], $dbPayload['branch_code'], $dbPayload['reporting_manager_code'], $dbPayload['reporting_to'], $dbPayload['reporting_manager']);
                
                $rowData['db_payload'] = $dbPayload;
            }

            $results['rows'][] = $rowData;
            $results['total_rows']++;
        });

        if (method_exists($reader, 'close')) {
            $reader->close();
        }

        return $results;
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
