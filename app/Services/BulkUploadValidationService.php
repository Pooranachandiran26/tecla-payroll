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
        $reader = SimpleExcelReader::create($filePath);
        
        $results = [
            'valid_count' => 0,
            'warning_count' => 0,
            'error_count' => 0,
            'total_rows' => 0,
            'rows' => []
        ];

        $seenEmails = [];
        $seenPhones = [];
        $seenPans = [];
        $seenAadhaars = [];
        $seenBankAccounts = [];

        $clientsCache = [];

        $rowIndex = 1; // Header is usually row 1 in Excel terms, so data starts at row 2, but we'll use a simple counter.

        $reader->getRows()->each(function(array $row) use (
            &$results, &$seenEmails, &$seenPhones, &$seenPans, &$seenAadhaars, &$seenBankAccounts, &$clientsCache, &$rowIndex
        ) {
            $rowIndex++;
            
            // Normalize keys to snake_case just in case they have spaces
            $normalizedRow = [];
            foreach ($row as $key => $value) {
                $normalizedRow[Str::snake(trim($key))] = trim($value);
            }

            $errors = [];
            $warnings = [];

            // 1. Mandatory Employee Code
            if (empty($normalizedRow['employee_code'])) {
                $errors[] = "Mandatory Employee Code is missing.";
            }

            // 2. Client Resolution
            $clientCode = $normalizedRow['client_code'] ?? null;
            $client = null;
            if (empty($clientCode)) {
                $errors[] = "Client Code is required.";
            } else {
                if (!isset($clientsCache[$clientCode])) {
                    $clientsCache[$clientCode] = Client::with('branches')->where('client_code', $clientCode)->first();
                }
                $client = $clientsCache[$clientCode];

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
                    $branchCodeOrName = $normalizedRow['branch_name'] ?? $normalizedRow['branch_code'] ?? null;
                    if (empty($branchCodeOrName)) {
                        $errors[] = "Client '{$client->company_name}' has multiple branches — please specify branch_name or branch_code.";
                    } else {
                        $matchedBranch = $branches->first(function($b) use ($branchCodeOrName) {
                            return $b->branch_name === $branchCodeOrName || $b->branch_code === $branchCodeOrName;
                        });
                        if ($matchedBranch) {
                            $branchId = $matchedBranch->id;
                        } else {
                            $errors[] = "Branch '{$branchCodeOrName}' does not exist for client '{$client->company_name}'.";
                        }
                    }
                }
            }

            // 4. Intra-file duplicate tracking
            $email = $normalizedRow['personal_email'] ?? null;
            if ($email) {
                if (in_array($email, $seenEmails)) {
                    $errors[] = "Duplicate personal_email within this file.";
                }
                $seenEmails[] = $email;
            }

            $phone = $normalizedRow['phone_number'] ?? null;
            if ($phone) {
                if (in_array($phone, $seenPhones)) {
                    $errors[] = "Duplicate phone_number within this file.";
                }
                $seenPhones[] = $phone;
            }

            $pan = $normalizedRow['pan_number'] ?? null;
            if ($pan) {
                if (in_array($pan, $seenPans)) {
                    $errors[] = "Duplicate pan_number within this file.";
                }
                $seenPans[] = $pan;
            }

            $aadhaar = $normalizedRow['aadhaar_number'] ?? null;
            if ($aadhaar) {
                if (in_array($aadhaar, $seenAadhaars)) {
                    $errors[] = "Duplicate aadhaar_number within this file.";
                }
                $seenAadhaars[] = $aadhaar;
            }

            $bankAcc = $normalizedRow['bank_account_number'] ?? null;
            if ($bankAcc) {
                if (in_array($bankAcc, $seenBankAccounts)) {
                    $errors[] = "Duplicate bank_account_number within this file.";
                }
                $seenBankAccounts[] = $bankAcc;
            }

            // 5. Statutory Inheritance & Fallbacks
            $pfApplicable = $normalizedRow['pf_applicable'] ?? null;
            if ($pfApplicable === null || $pfApplicable === '') {
                $pfApplicable = $client ? $client->pf_applicable : false;
            } else {
                $pfApplicable = filter_var($pfApplicable, FILTER_VALIDATE_BOOLEAN);
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
            $lopBasisDays = $normalizedRow['lop_basis_days'] ?? '26';

            $validationData = array_merge($normalizedRow, [
                'pf_applicable' => $pfApplicable,
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
            ]);

            $rules = [
                'full_name' => 'required|string|max:255',
                'personal_email' => 'required|email|unique:employees,personal_email',
                'phone_number' => 'required|string|max:15|unique:employees,phone_number',
                'emergency_contact_phone' => 'nullable|string|max:15',
                'date_of_birth' => 'required|date',
                'date_of_joining' => 'required|date',
                'designation' => 'required|string|max:255',
                'gender' => 'nullable|in:male,female,other',
                'blood_group' => 'nullable|string|max:10',
                'marital_status' => 'nullable|in:single,married,other',
                'employment_model' => 'required|in:eor,agency_contract',
                'prior_employment_flag' => 'required|boolean',
                'residential_address' => 'required|string',
                
                // Banking
                'bank_account_number' => [
                    'required',
                    'string',
                    function ($attribute, $value, $fail) {
                        if (Employee::where('bank_account_hash', hash('sha256', $value))->exists()) {
                            $fail('This bank account is already registered to another employee.');
                        }
                    }
                ],
                'bank_ifsc' => 'required|string|regex:/^[A-Z]{4}0[A-Z0-9]{6}$/',
                'bank_name' => 'nullable|string',
                'bank_branch' => 'nullable|string',
                'account_holder_name' => 'required|string|max:255',
                
                // Identity
                'pan_number' => [
                    'required',
                    'string',
                    'regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/',
                    function ($attribute, $value, $fail) {
                        if (Employee::where('pan_number_hash', hash('sha256', $value))->exists()) {
                            $fail('This PAN number is already registered to another employee.');
                        }
                    }
                ],
                'aadhaar_number' => [
                    'nullable',
                    'string',
                    function ($attribute, $value, $fail) {
                        if (Employee::where('aadhaar_number_hash', hash('sha256', $value))->exists()) {
                            $fail('This Aadhaar number is already registered to another employee.');
                        }
                    }
                ],
                
                // Statutory
                'uan_mode' => 'nullable|in:new,existing_transfer',
                'uan_number' => [
                    'nullable',
                    'digits:12',
                    Rule::requiredIf(fn() => $pfApplicable && ($validationData['uan_mode'] ?? 'new') === 'existing_transfer')
                ],
                'esic_number' => [
                    'nullable',
                    'digits:10',
                    Rule::requiredIf(fn() => $esiApplicable)
                ],
                'tds_regime' => 'required|in:old,new',
                'gratuity_mode' => 'required|in:part_of_ctc,over_and_above',
                'lop_basis_days' => 'required|in:26,30',
                
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

            // 7. Salary Calculation Preview
            $salaryPreview = null;
            if (empty($errors)) {
                $salaryPreview = $this->salaryService->calculateStructuralSalary($validationData);
                
                // 8. Wage Code Warning
                $basic = $validationData['basic_pay'] ?? 0;
                $ctc = $salaryPreview['ctc_monthly'] ?? 0;
                if ($ctc > 0 && $basic < ($ctc * 0.5)) {
                    $warnings[] = "Basic pay ($basic) is less than 50% of CTC ($ctc) (Wage Code Warning).";
                }
            }

            // Summarize status
            $status = 'ready';
            if (!empty($errors)) {
                $status = 'error';
                $results['error_count']++;
            } elseif (!empty($warnings)) {
                $status = 'warning';
                $results['warning_count']++;
            } else {
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
                $dbPayload['client_id'] = $client->id;
                $dbPayload['branch_id'] = $branchId;
                $dbPayload['status'] = 'onboarding'; // same as manual creation
                // Remove client_code or branch_name which are not in Employee table
                unset($dbPayload['client_code'], $dbPayload['branch_name'], $dbPayload['branch_code']);
                
                $rowData['db_payload'] = $dbPayload;
            }

            $results['rows'][] = $rowData;
            $results['total_rows']++;
        });

        return $results;
    }
}
