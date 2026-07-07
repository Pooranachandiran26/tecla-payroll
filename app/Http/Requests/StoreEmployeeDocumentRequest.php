<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeDocumentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['admin', 'manager']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:pdf,jpg,png|max:5120',
            'document_type' => [
                'required',
                'string',
                Rule::in([
                    'pan_card',
                    'aadhaar_card',
                    'offer_letter',
                    'relieving_letter',
                    'education_certificate',
                    'bank_passbook',
                    'photo',
                    'previous_payslips',
                    'other'
                ])
            ],
        ];
    }
}
