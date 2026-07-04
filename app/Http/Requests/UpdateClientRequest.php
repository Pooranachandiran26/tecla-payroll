<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation()
    {
        $mapped = [
            'company_name' => $this->name,
            'company_type' => $this->type,
            'client_code' => $this->code,
            'trust_registration_number' => $this->trustRegNo,
            'pan_number' => $this->pan,
            'cin_number' => $this->cin,
            'incorporation_date' => $this->incorporationDate,
            'registered_address_line_1' => $this->regAddressLine1,
            'registered_address_line_2' => $this->regAddressLine2,
            'registered_city' => $this->regCity,
            'registered_state' => $this->regState,
            'registered_pin' => $this->regPin,
            'tax_id' => $this->taxId,
            'registration_number' => $this->regNo,
            'contract_type' => $this->contractType,
            'billing_model' => $this->billingModel,
            'markup_percentage' => $this->markupPct,
            'fixed_fee_amount' => $this->fixedFeeCandidate,
            'contract_start_date' => $this->contractStart,
            'contract_end_date' => $this->contractEnd,
        ];

        $contacts = [];
        if ($this->has('poc1') && (isset($this->poc1['name']) || isset($this->poc1['email']))) {
            $contacts[] = array_merge($this->poc1, ['contact_type' => 'primary']);
        }
        if ($this->has('poc2') && (isset($this->poc2['name']) || isset($this->poc2['email']))) {
            $contacts[] = array_merge($this->poc2, ['contact_type' => 'finance']);
        }
        if ($this->has('poc3') && (isset($this->poc3['name']) || isset($this->poc3['email']))) {
            $contacts[] = array_merge($this->poc3, ['contact_type' => 'hr']);
        }
        if ($this->has('extraContacts') && is_array($this->extraContacts)) {
            foreach ($this->extraContacts as $extra) {
                $role = $extra['role'] ?? 'operations';
                $contacts[] = array_merge($extra, ['contact_type' => $role]);
            }
        }
        if (!empty($contacts)) {
            $mapped['contacts'] = $contacts;
        }

        if ($this->has('branches') && is_array($this->branches)) {
            $mappedBranches = [];
            $stateCodeMap = [
                'Jammu and Kashmir' => '01', 'Himachal Pradesh' => '02', 'Punjab' => '03', 'Chandigarh' => '04',
                'Uttarakhand' => '05', 'Haryana' => '06', 'Delhi' => '07', 'Rajasthan' => '08', 'Uttar Pradesh' => '09',
                'Bihar' => '10', 'Sikkim' => '11', 'Arunachal Pradesh' => '12', 'Nagaland' => '13', 'Manipur' => '14',
                'Mizoram' => '15', 'Tripura' => '16', 'Meghalaya' => '17', 'Assam' => '18', 'West Bengal' => '19',
                'Jharkhand' => '20', 'Odisha' => '21', 'Chhattisgarh' => '22', 'Madhya Pradesh' => '23', 'Gujarat' => '24',
                'Daman and Diu' => '25', 'Dadra and Nagar Haveli' => '26', 'Maharashtra' => '27', 'Andhra Pradesh (Old)' => '28', 
                'Karnataka' => '29', 'Goa' => '30', 'Lakshadweep' => '31', 'Kerala' => '32', 'Tamil Nadu' => '33', 'Puducherry' => '34',
                'Andaman and Nicobar Islands' => '35', 'Telangana' => '36', 'Andhra Pradesh' => '37', 'Ladakh' => '38'
            ];

            foreach ($this->branches as $branch) {
                $stateName = $branch['state'] ?? null;
                $mappedBranches[] = [
                    'branch_name' => $branch['name'] ?? null,
                    'location' => trim(($branch['addr1'] ?? '') . ' ' . ($branch['city'] ?? '')),
                    'state' => $stateName,
                    'is_head_office' => $branch['isPrimary'] ?? false,
                    'gstin' => $branch['gstin'] ?? null,
                    'gst_registration_type' => $branch['gstType'] ?? null,
                    'finance_poc_name' => $branch['pocName'] ?? null,
                    'finance_poc_email' => $branch['pocEmail'] ?? null,
                    'finance_poc_phone' => $branch['pocPhone'] ?? null,
                    'state_code' => $stateName ? ($stateCodeMap[$stateName] ?? null) : null,
                ];
            }
            $mapped['branches'] = $mappedBranches;
        }

        $this->merge($mapped);
    }

    public function rules(): array
    {
        $clientId = $this->route('client') ? $this->route('client')->id : null;
        return [
            // Step 1
            'company_name' => 'required|string|max:255',
            'client_code' => 'required|string|unique:clients,client_code,' . $clientId,
            'company_type' => 'required|in:pvt_ltd,pub_ltd,llp,opc,partnership,proprietorship,trust,govt',
            'pan_number' => ['nullable', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/'],
            'gstin' => ['nullable', 'string', 'size:15', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/'],
            
            // Step 2
            'registered_address_line_1' => 'required|string|max:255',
            'registered_city' => 'required|string|max:100',
            'registered_state' => 'required|string|max:100',
            'registered_pin' => ['required', 'digits:6', 'regex:/^[1-9][0-9]{5}$/'],
            
            // Step 4
            'contract_type' => 'required|in:agency,eor,hybrid,consulting',
            'billing_model' => 'required|in:markup,fixed_per_candidate,fixed_per_month,lumpsum,hourly',
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'nullable|date|after:contract_start_date',
            'markup_percentage' => 'required_if:billing_model,markup|numeric|min:0|max:100',
            'fixed_fee_amount' => 'required_if:billing_model,fixed_per_candidate|numeric|min:0',
            
            // Contacts
            'contacts' => [
                'required',
                'array',
                'min:1',
                function($attribute, $value, $fail) {
                    if (!collect($value)->contains('contact_type', 'primary')) {
                        $fail('At least one Primary contact is required.');
                    }
                }
            ],
            'contacts.*.email' => 'required|email',
            'contacts.*.phone' => ['required', 'regex:/^[6-9][0-9]{9}$/'],
            'branches.*.gstin' => ['nullable', 'string', 'size:15', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $data = $this->all();
            if (!empty($data['pan_number']) && !empty($data['gstin'])) {
                if (substr($data['gstin'], 2, 10) !== $data['pan_number']) {
                    $validator->errors()->add('gstin', 'GSTIN must match the provided PAN (characters 3-12).');
                }
            }

            // Branch GSTIN matching
            if (!empty($data['branches']) && is_array($data['branches'])) {
                foreach ($data['branches'] as $index => $branch) {
                    if (!empty($branch['gstin']) && !empty($branch['state_code'])) {
                        $stateCode = str_pad($branch['state_code'], 2, '0', STR_PAD_LEFT);
                        if (substr($branch['gstin'], 0, 2) !== $stateCode) {
                            $validator->errors()->add("branches.{$index}.gstin", "Branch GSTIN must start with the correct state code ({$stateCode}).");
                        }
                    }
                }
            }
        });
    }
}
