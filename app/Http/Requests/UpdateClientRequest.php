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
