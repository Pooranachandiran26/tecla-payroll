<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Employee;

class StoreEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user || !in_array($user->role, ['admin', 'manager'])) {
            return false;
        }

        if ($user->role === 'manager') {
            $clientId = $this->clientPartner ?: $this->client_id;
            if ($clientId && !$user->isManagerForClient($clientId)) {
                return false;
            }
        }

        return true;
    }

    protected function prepareForValidation()
    {
        $firstName = $this->firstName ?: $this->first_name;
        $lastName = $this->lastName ?: $this->last_name;
        $fatherName = $this->fatherName ?: $this->father_name;

        $fullName = trim(($firstName ?: '') . ' ' . ($lastName ?: ''));
        if (empty($fullName)) {
            $fullName = trim($this->fullName ?: $this->full_name ?: '');
        }

        if (empty($firstName) || empty($lastName)) {
            if (!empty($fullName)) {
                $parts = explode(' ', $fullName, 2);
                if (empty($firstName)) $firstName = $parts[0] ?? 'Employee';
                if (empty($lastName)) $lastName = $parts[1] ?? 'Name';
            }
        }

        if (empty($fatherName)) {
            $fatherName = 'N/A';
        }

        $motherName = $this->motherName ?: $this->mother_name;
        $spouseName = $this->spouseName ?: $this->wifeName ?: $this->spouse_name;

        $clientId = $this->clientPartner ?: $this->client_id;
        $branchId = $this->branchPartner ?: $this->branchId ?: $this->branch_id;

        if (empty($branchId) && !empty($clientId)) {
            $defaultBranch = \App\Models\ClientBranch::where('client_id', $clientId)->first();
            $branchId = $defaultBranch ? $defaultBranch->id : 1;
        }

        // Ensure default fallback values for boolean toggles if missing
        $this->merge([
            'client_id' => $clientId,
            'branch_id' => $branchId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'father_name' => $fatherName,
            'mother_name' => $motherName,
            'spouse_name' => $spouseName,
            'full_name' => $fullName,
            'personal_email' => $this->personalEmail ?? $this->personal_email,
            'phone_number' => $this->phone ?? $this->phone_number,
            'emergency_contact_phone' => $this->emergencyContact ?? $this->emergency_contact_phone,
            'gender' => $this->gender,
            'is_disabled' => ($this->isDisabled !== null || $this->is_disabled !== null) ? (filter_var($this->isDisabled ?? $this->is_disabled, FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 0,
            'disability_type' => $this->disabilityType ?: $this->disability_type ?: null,
            'disability_percentage' => ($this->disabilityPercentage !== null && $this->disabilityPercentage !== '') ? (int)$this->disabilityPercentage : (($this->disability_percentage !== null && $this->disability_percentage !== '') ? (int)$this->disability_percentage : null),
            'udid_card_number' => $this->udidCardNumber ?: $this->udid_card_number ?: null,
            'blood_group' => $this->bloodGroup ?? $this->blood_group,
            'marital_status' => $this->maritalStatus ?? $this->marital_status,
            'date_of_birth' => $this->dob ?? $this->date_of_birth,
            'date_of_joining' => $this->doj ?? $this->date_of_joining,
            'attendance_tracking_start_date' => $this->attendanceTrackingStartDate ?: $this->attendance_tracking_start_date,
            'employment_model' => $this->empType ?? $this->employment_model,
            'prior_employment_flag' => ($this->priorEmploymentFlag !== null || $this->prior_employment_flag !== null) ? (filter_var($this->priorEmploymentFlag ?? $this->prior_employment_flag, FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 1,
            'residential_address' => $this->address ?? $this->residential_address,
            'bank_account_number' => $this->accountNo ?? $this->bank_account_number,
            'bank_ifsc' => $this->ifsc ?? $this->bank_ifsc,
            'bank_name' => $this->bankName ?? $this->bank_name,
            'bank_branch' => $this->bankBranch ?? $this->bank_branch,
            'account_holder_name' => $this->accountHolder ?? $this->account_holder_name,
            'pan_number' => $this->pan ?? $this->pan_number,
            'aadhaar_number' => $this->aadhaar ?? $this->aadhaar_number,
            'uan_mode' => $this->uanMode ?? $this->uan_mode ?? 'new',
            'uan_number' => $this->uan ?? $this->uan_number,
            'pf_member_id' => $this->pfMemberId ?? $this->pf_member_id ?? null,
            'member_relationship' => $this->memberRelationship ?? $this->member_relationship ?? 'F',
            'esi_mode' => $this->esiMode ?? $this->esi_mode ?? 'new',
            'esic_number' => $this->esiNo ?? $this->esic_number,
            'basic_pay' => $this->basicSal ?? $this->basic_pay,
            'hra' => $this->hraSal ?? $this->hra,
            'conveyance' => $this->conveyanceSal ?? $this->conveyance ?? 0,
            'da' => $this->daSal ?? $this->da ?? 0,
            'medical_allowance' => $this->medicalSal ?? $this->medical_allowance ?? 0,
            'special_allowance' => $this->specialSal ?? $this->special_allowance ?? 0,
            'other_additions' => $this->otherSal ?? $this->other_additions ?? 0,
            'pt_deduction_override' => $this->ptDeduction ?? $this->pt_deduction_override,
            'pf_applicable' => filter_var($this->pfToggle ?? $this->pf_applicable ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'eps_applicable' => $this->epsToggle !== null ? (filter_var($this->epsToggle, FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : ($this->eps_applicable !== null ? (filter_var($this->eps_applicable, FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 1),
            'vpf_enabled' => ($this->vpfToggle !== null || $this->vpf_enabled !== null || $this->vpfEnabled !== null) ? (filter_var($this->vpfToggle ?? $this->vpfEnabled ?? $this->vpf_enabled, FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : 0,
            'vpf_type' => $this->vpfType ?: $this->vpf_type ?: null,
            'vpf_value' => ($this->vpfValue !== null && $this->vpfValue !== '') ? (float)$this->vpfValue : (($this->vpf_value !== null && $this->vpf_value !== '') ? (float)$this->vpf_value : null),
            'esi_applicable' => filter_var($this->esiToggle ?? $this->esi_applicable ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'health_insurance_provider' => $this->insuranceProvider ?? $this->health_insurance_provider ?? null,
            'health_insurance_policy_no' => $this->insurancePolicyNo ?? $this->health_insurance_policy_no ?? null,
            'health_insurance_sum_insured' => ($this->insuranceSumInsured !== null && $this->insuranceSumInsured !== '') ? (float)$this->insuranceSumInsured : (($this->health_insurance_sum_insured !== null && $this->health_insurance_sum_insured !== '') ? (float)$this->health_insurance_sum_insured : null),
            'tds_applicable' => filter_var($this->tdsToggle ?? $this->tds_applicable ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'pt_applicable' => filter_var($this->ptToggle ?? $this->pt_applicable ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'lwf_applicable' => filter_var($this->lwfToggle ?? $this->lwf_applicable ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'bonus_toggle' => filter_var($this->bonusToggle ?? $this->bonus_toggle ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'tds_regime' => $this->taxRegime ?? $this->tds_regime ?? 'new',
            'declarations_accepted' => ($this->declarations_accepted !== null || $this->declarationsAccepted !== null) ? (filter_var($this->declarations_accepted ?? $this->declarationsAccepted, FILTER_VALIDATE_BOOLEAN) ? 1 : 0) : ($this->declarations === 'yes' ? 1 : 0),
            'gratuity_mode' => $this->gratuityMode ?? 'part_of_ctc',
            'lop_basis_days' => '30',
            'weekly_off_pattern' => $this->weeklyOffPattern ?: $this->weekly_off_pattern ?: null,
            'emergency_contact_name' => $this->emergencyContactName,
            'previous_employer_name' => $this->prevEmployerName,
            'previous_employer_uan' => $this->prevEmployerUAN,
            'probation_end_date' => $this->probationEndDate,
            'reporting_manager_id' => is_numeric($this->reportingManagerId ?? $this->reporting_manager_id) ? (int)($this->reportingManagerId ?? $this->reporting_manager_id) : null,
            'notice_period_days' => $this->noticePeriodDays,
            'joint_declaration_status' => $this->jointDeclarationStatus ?? $this->joint_declaration_status ?? 'not_required',
            'esi_contribution_period_end' => $this->esiPeriodEnd,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Draft/incomplete clients are setup records, not operational clients — an employee
            // must never be created against a client whose onboarding isn't complete, even via a
            // direct API request that bypasses the (already-filtered) client dropdown.
            'client_id' => [
                'required',
                Rule::exists('clients', 'id')->where(fn($q) => $q->where('status', 'active')),
            ],
            'branch_id' => 'nullable|exists:client_branches,id',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'father_name' => 'required|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'spouse_name' => 'nullable|string|max:255',
            'full_name' => 'nullable|string|max:255',
            'personal_email' => 'required|email|unique:employees,personal_email|unique:users,email',
            'phone_number' => 'required|string|max:15|unique:employees,phone_number',
            'emergency_contact_phone' => 'nullable|string|max:15',
            'date_of_birth' => 'required|date|date_format:Y-m-d|before:-18 years',
            'date_of_joining' => 'required|date|date_format:Y-m-d',
            'attendance_tracking_start_date' => 'nullable|date|date_format:Y-m-d|after_or_equal:date_of_joining',
            'designation' => 'required|string|max:255',
            'gender' => 'nullable|in:male,female,other',
            'is_disabled' => 'nullable|boolean',
            'disability_type' => 'nullable|string|max:50',
            'disability_percentage' => 'nullable|integer|min:40|max:100',
            'udid_card_number' => 'nullable|string|max:50',
            'blood_group' => 'nullable|string|max:10',
            'marital_status' => 'nullable|in:single,married,other',
            'employment_model' => [
                'required',
                'in:eor,agency_contract',
                function ($attribute, $value, $fail) {
                    if ($this->client_id) {
                        $client = \App\Models\Client::find($this->client_id);
                        if ($client) {
                            if ($client->contract_type === 'agency' && $value === 'eor') {
                                $fail("Employment model 'eor' is not permitted for client '{$client->company_name}' configured under Agency Payroll (agency). Must be 'agency_contract'.");
                            } elseif ($client->contract_type === 'eor' && $value === 'agency_contract') {
                                $fail("Employment model 'agency_contract' is not permitted for client '{$client->company_name}' configured under Pass-through EOR (eor). Must be 'eor'.");
                            }
                        }
                    }
                }
            ],
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
                Rule::requiredIf(fn() => $this->pf_applicable && $this->uan_mode === 'existing_transfer')
            ],
            'pf_member_id' => 'nullable|string|max:50',
            'member_relationship' => 'nullable|in:F,S',
            'esi_mode' => 'nullable|in:new,existing_transfer',
            'esic_number' => [
                'nullable',
                'digits:10',
                Rule::requiredIf(fn() => $this->esi_applicable && ($this->esi_mode ?? 'new') === 'existing_transfer')
            ],
            'pf_applicable' => 'boolean',
            'eps_applicable' => 'nullable|boolean',
            'vpf_enabled' => 'nullable|boolean',
            'vpf_type' => 'nullable|required_if:vpf_enabled,1,true|in:percentage,fixed_amount',
            'vpf_value' => 'nullable|required_if:vpf_enabled,1,true|numeric|min:0.01',
            'joint_declaration_status' => 'nullable|string|in:not_required,pending,submitted,approved',
            'esi_applicable' => 'boolean',
            'health_insurance_provider' => 'nullable|string|max:100',
            'health_insurance_policy_no' => 'nullable|string|max:100',
            'health_insurance_sum_insured' => 'nullable|numeric|min:0',
            'tds_applicable' => 'boolean',
            'pt_applicable' => 'boolean',
            'lwf_applicable' => 'boolean',
            'bonus_toggle' => 'boolean',
            'tds_regime' => 'required|in:old,new',
            'gratuity_mode' => 'required|in:part_of_ctc,over_and_above',
            'lop_basis_days' => 'required|integer|min:15|max:31',
            'weekly_off_pattern' => 'nullable|string',
            
            // Salary
            'basic_pay' => 'required|numeric|min:0',
            'hra' => 'required|numeric|min:0',
            'conveyance' => 'required|numeric|min:0',
            'da' => 'required|numeric|min:0',
            'medical_allowance' => 'required|numeric|min:0',
            'special_allowance' => 'required|numeric|min:0',
            'other_additions' => 'required|numeric|min:0',
            'pt_deduction_override' => 'nullable|numeric|min:0',

            // Previously missing fields
            'emergency_contact_name' => 'nullable|string|max:255',
            'previous_employer_name' => 'nullable|string|max:255',
            'previous_employer_uan' => 'nullable|string|max:255',
            'probation_end_date' => 'nullable|date|date_format:Y-m-d|after_or_equal:date_of_joining',
            'reporting_manager_id' => 'nullable|exists:employees,id',
            'notice_period_days' => 'nullable|integer|min:0',
            'esi_contribution_period_end' => 'nullable|date|date_format:Y-m-d',
            'declarations_accepted' => 'required|boolean',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $clientId = $this->client_id ?: $this->clientPartner;
            if ($clientId) {
                $client = \App\Models\Client::find($clientId);
                if ($client) {
                    $isActualOnEmp = ($client->employee_pf_wage_basis === 'actual_basic_da');
                    $isActualOnEmpr = ($client->employer_pf_wage_basis === 'actual_basic_da');
                    $basicDa = ((float)($this->basic_pay ?? 0)) + ((float)($this->da ?? 0));

                    if (($isActualOnEmp || $isActualOnEmpr) && $basicDa > 15000) {
                        $status = $this->joint_declaration_status ?? $this->jointDeclarationStatus ?? 'not_required';
                        if ($status === 'not_required' || empty($status)) {
                            $validator->errors()->add('joint_declaration_status', 'EPF Para 26(6) Joint Declaration Status must be Pending Attestation, Submitted, or Approved when PF wage basis is Actual Basic+DA and Basic+DA exceeds ₹15,000.');
                        }
                    }
                }
            }

            if ($this->vpf_enabled) {
                $basicDa = ((float)($this->basic_pay ?? 0)) + ((float)($this->da ?? 0));
                if ($this->vpf_type === 'percentage') {
                    if ((float)$this->vpf_value > 88.0) {
                        $validator->errors()->add('vpf_value', 'VPF percentage cannot exceed 88% (Statutory cap: Mandatory 12% + VPF cannot exceed 100% of Basic+DA under EPF Scheme Para 29).');
                    }
                } elseif ($this->vpf_type === 'fixed_amount') {
                    $clientModel = $clientId ? \App\Models\Client::find($clientId) : null;
                    $empBasis = $this->employee_pf_wage_basis ?: ($clientModel ? ($clientModel->employee_pf_wage_basis ?? 'ceiling') : 'ceiling');
                    $pfCeiling = (float)($clientModel ? ($clientModel->pf_ceiling ?? 15000) : 15000);
                    $mandatoryPfWage = ($empBasis === 'actual_basic_da') ? $basicDa : min($basicDa, $pfCeiling);
                    $mandatoryPf = round($mandatoryPfWage * 0.12, 2);
                    $maxFixed = max(0.00, $basicDa - $mandatoryPf);
                    if ((float)$this->vpf_value > $maxFixed) {
                        $validator->errors()->add('vpf_value', "VPF fixed amount cannot exceed ₹" . number_format($maxFixed, 2) . " (Basic+DA minus mandatory EPF).");
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'disability_percentage.min' => 'Disability percentage must be at least 40% to qualify as a Person with Benchmark Disability (PwD) under the RPwD Act, 2016 for the ₹25,000 ESI ceiling.',
            'disability_percentage.max' => 'Disability percentage cannot exceed 100%.',
            'client_id.exists' => 'This client has not completed onboarding and is not available for adding employees.',
        ];
    }
}
