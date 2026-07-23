<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Employee;

class UpdateEmployeeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['admin', 'manager']);
    }

    protected function prepareForValidation()
    {
        // Ensure default fallback values for boolean toggles if missing
        $this->merge([
            'client_id' => $this->clientPartner,
            'full_name' => $this->fullName,
            'personal_email' => $this->personalEmail,
            'phone_number' => $this->phone,
            'emergency_contact_phone' => $this->emergencyContact,
            'gender' => $this->gender,
            'blood_group' => $this->bloodGroup,
            'marital_status' => $this->maritalStatus,
            'date_of_birth' => $this->dob,
            'date_of_joining' => $this->doj,
            'attendance_tracking_start_date' => $this->attendanceTrackingStartDate ?: $this->attendance_tracking_start_date,
            'employment_model' => $this->empType,
            'prior_employment_flag' => $this->priorEmploymentFlag ? 1 : 0,
            'residential_address' => $this->address,
            'bank_account_number' => $this->accountNo,
            'bank_ifsc' => $this->ifsc,
            'bank_name' => $this->bankName,
            'bank_branch' => $this->bankBranch,
            'account_holder_name' => $this->accountHolder,
            'pan_number' => $this->pan,
            'aadhaar_number' => $this->aadhaar,
            'uan_mode' => $this->uanMode,
            'uan_number' => $this->uan,
            'esi_mode' => $this->esiMode ?? 'new',
            'esic_number' => $this->esiNo,
            'basic_pay' => $this->basicSal,
            'hra' => $this->hraSal,
            'conveyance' => $this->conveyanceSal,
            'da' => $this->daSal,
            'medical_allowance' => $this->medicalSal,
            'special_allowance' => $this->specialSal,
            'other_additions' => $this->otherSal,
            'pt_deduction_override' => $this->ptDeduction,
            'pf_applicable' => filter_var($this->pfToggle, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'esi_applicable' => filter_var($this->esiToggle, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'tds_applicable' => filter_var($this->tdsToggle, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'pt_applicable' => filter_var($this->ptToggle, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'lwf_applicable' => filter_var($this->lwfToggle, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'bonus_toggle' => $this->bonusToggle ? 1 : 0,
            'tds_regime' => $this->taxRegime ?? 'new',
            'declarations_accepted' => $this->declarations === 'yes' ? 1 : 0,
            'gratuity_mode' => $this->gratuityMode ?? 'part_of_ctc',
            'lop_basis_days' => $this->lopBasis ?? '26',
            'weekly_off_pattern' => $this->weeklyOffPattern ?: $this->weekly_off_pattern ?: null,
            'emergency_contact_name' => $this->emergencyContactName,
            'previous_employer_name' => $this->prevEmployerName,
            'previous_employer_uan' => $this->prevEmployerUAN,
            'probation_end_date' => $this->probationEndDate,
            'reporting_manager_id' => $this->reportingManagerId,
            'notice_period_days' => $this->noticePeriodDays,
            'esi_contribution_period_end' => $this->esiPeriodEnd,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $employeeId = $this->route('id'); // ID from the URL

        return [
            'client_id' => 'required|exists:clients,id',
            'full_name' => 'required|string|max:255',
            'personal_email' => 'required|email|unique:employees,personal_email,' . $employeeId . '|unique:users,email,'. $employeeId .',employee_id',
            'phone_number' => 'required|string|max:15|unique:employees,phone_number,' . $employeeId,
            'emergency_contact_phone' => 'nullable|string|max:15',
            'date_of_birth' => 'required|date|date_format:Y-m-d|before:-18 years',
            'date_of_joining' => 'required|date',
            'attendance_tracking_start_date' => 'nullable|date|date_format:Y-m-d|after_or_equal:date_of_joining',
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
                function ($attribute, $value, $fail) use ($employeeId) {
                    $exists = Employee::where('bank_account_hash', hash('sha256', $value))
                                    ->where('id', '!=', $employeeId)
                                    ->exists();
                    if ($exists) {
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
                function ($attribute, $value, $fail) use ($employeeId) {
                    $exists = Employee::where('pan_number_hash', hash('sha256', $value))
                                    ->where('id', '!=', $employeeId)
                                    ->exists();
                    if ($exists) {
                        $fail('This PAN number is already registered to another employee.');
                    }
                }
            ],
            'aadhaar_number' => [
                'nullable',
                'string',
                function ($attribute, $value, $fail) use ($employeeId) {
                    $exists = Employee::where('aadhaar_number_hash', hash('sha256', $value))
                                    ->where('id', '!=', $employeeId)
                                    ->exists();
                    if ($exists) {
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
            'esi_mode' => 'nullable|in:new,existing_transfer',
            'esic_number' => [
                'nullable',
                'digits:10',
                Rule::requiredIf(fn() => $this->esi_applicable && ($this->esi_mode ?? 'new') === 'existing_transfer')
            ],
            'pf_applicable' => 'boolean',
            'esi_applicable' => 'boolean',
            'tds_applicable' => 'boolean',
            'pt_applicable' => 'boolean',
            'lwf_applicable' => 'boolean',
            'bonus_toggle' => 'boolean',
            'tds_regime' => 'required|in:old,new',
            'gratuity_mode' => 'required|in:part_of_ctc,over_and_above',
            'lop_basis_days' => 'required|integer|min:15|max:31',
            'weekly_off_pattern' => ['nullable', 'string', 'regex:/^(mon|tue|wed|thu|fri|sat|sun)(,(mon|tue|wed|thu|fri|sat|sun)){0,6}$/i'],
            
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
            'probation_end_date' => 'nullable|date|after_or_equal:date_of_joining',
            'reporting_manager_id' => 'nullable|exists:employees,id',
            'notice_period_days' => 'nullable|integer|min:0',
            'esi_contribution_period_end' => 'nullable|date',
            'declarations_accepted' => 'required|boolean',
        ];
    }
}
