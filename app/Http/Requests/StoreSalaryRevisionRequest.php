<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSalaryRevisionRequest extends FormRequest
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
            'new_basic_pay' => 'required|numeric|min:0',
            'new_hra' => 'required|numeric|min:0',
            'new_conveyance' => 'required|numeric|min:0',
            'new_da' => 'required|numeric|min:0',
            'new_medical_allowance' => 'required|numeric|min:0',
            'new_special_allowance' => 'required|numeric|min:0',
            'new_other_additions' => 'required|numeric|min:0',
            'effective_date' => 'required|date|before_or_equal:today',
            'reason_for_revision' => 'required|string|max:255',
        ];
    }
}
