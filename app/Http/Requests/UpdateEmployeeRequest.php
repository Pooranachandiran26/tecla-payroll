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
            'date_of_birth' => $this->dob,
            'date_of_joining' => $this->doj,
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
            'esic_number' => $this->esiNo,
            'basic_pay' => $this->basicSal ?? 0,
            'hra' => $this->hraSal ?? 0,
            'conveyance' => $this->conveyanceSal ?? 0,
            'da' => $this->daSal ?? 0,
            'medical_allowance' => $this->medicalSal ?? 0,
            'special_allowance' => $this->specialSal ?? 0,
            'other_additions' => $this->otherSal ?? 0,
            'pt_deduction_override' => $this->ptDeduction,
            'pf_applicable' => $this->pfToggle ? 1 : 0,
            'esi_applicable' => $this->esiToggle ? 1 : 0,
            'tds_applicable' => $this->tdsToggle ? 1 : 0,
            'pt_applicable' => $this->ptToggle ? 1 : 0,
            'lwf_applicable' => $this->lwfToggle ? 1 : 0,
            'bonus_toggle' => $this->bonusToggle ? 1 : 0,
            'tds_regime' => $this->taxRegime ?? 'new',
            'declarations_accepted' => $this->declarations === 'yes' ? 1 : 0,
            'gratuity_mode' => $this->gratuityMode ?? 'part_of_ctc',
            'lop_basis_days' => $this->lopBasis ?? '26',
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
            'personal_email' => 'required|email|unique:employees,personal_email,' . $employeeId,
            'phone_number' => 'required|string|max:15|unique:employees,phone_number,' . $employeeId,
            'emergency_contact_phone' => 'nullable|string|max:15',
            'date_of_birth' => 'required|date',
            'date_of_joining' => 'required|date',
            'designation' => 'required|string|max:255',
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
            'uan_mode' => 'required|in:new,existing_transfer',
            'uan_number' => 'required_if:pf_applicable,1|required_unless:uan_mode,new|nullable|string',
            'esic_number' => 'required_if:esi_applicable,1|nullable|string',
            'pf_applicable' => 'boolean',
            'esi_applicable' => 'boolean',
            'tds_applicable' => 'boolean',
            'pt_applicable' => 'boolean',
            'lwf_applicable' => 'boolean',
            'bonus_toggle' => 'boolean',
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
    }
}
