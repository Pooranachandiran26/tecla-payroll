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
            'is_promotion' => 'nullable|boolean',
            'new_designation' => [
                'required_if:is_promotion,true,1',
                'nullable',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    if ($this->boolean('is_promotion')) {
                        $employeeId = $this->route('id') ?? $this->route('employee');
                        $employee = $employeeId ? \App\Models\Employee::find($employeeId) : null;
                        if ($employee && strtolower(trim((string)$value)) === strtolower(trim((string)$employee->designation))) {
                            $fail('The new designation must differ from the current designation.');
                        }
                        if ($employee && !empty($employee->probation_end_date) && \Carbon\Carbon::parse($employee->probation_end_date)->startOfDay()->isFuture()) {
                            $formattedDate = \Carbon\Carbon::parse($employee->probation_end_date)->format('d M Y');
                            $fail("Warning: Employee is currently under probation until {$formattedDate}. Probation period must end before promoting an employee.");
                        }
                    }
                },
            ],
        ];
    }
}
