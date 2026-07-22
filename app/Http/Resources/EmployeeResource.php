<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

use App\Services\DataMasker;

class EmployeeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'client_id' => $this->client_id,
            'client_name' => $this->relationLoaded('client') && $this->client ? $this->client->company_name : null,
            'branch_id' => $this->branch_id,
            'full_name' => $this->full_name,
            'personal_email' => $this->personal_email,
            'phone_number' => $this->phone_number,
            'date_of_birth' => $this->date_of_birth,
            'date_of_joining' => $this->date_of_joining,
            'designation' => $this->designation,
            'employment_model' => $this->employment_model,
            'prior_employment_flag' => $this->prior_employment_flag,
            'status' => $this->status,
            'gender' => $this->gender,
            'blood_group' => $this->blood_group,
            'marital_status' => $this->marital_status,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'residential_address' => $this->residential_address,
            
            // Numeric salary fields are NOT masked
            'basic_pay' => $this->basic_pay,
            'hra' => $this->hra,
            'conveyance' => $this->conveyance,
            'da' => $this->da,
            'medical_allowance' => $this->medical_allowance,
            'special_allowance' => $this->special_allowance,
            'other_additions' => $this->other_additions,
            'gross_monthly_salary' => $this->gross_monthly_salary,
            'net_take_home_monthly' => $this->net_take_home_monthly,
            'employer_pf_monthly' => $this->employer_pf_monthly,
            'employer_esi_monthly' => $this->employer_esi_monthly,
            'ctc_monthly' => $this->ctc_monthly,
            'employee_pf_monthly' => $this->employee_pf_monthly,
            'employee_esi_monthly' => $this->employee_esi_monthly,
            'pt_monthly' => (float)($this->pt_deduction_override ?: 0),
            
            // Statutory settings
            'pf_applicable' => $this->pf_applicable,
            'esi_applicable' => $this->esi_applicable,
            'pt_applicable' => $this->pt_applicable,
            'lwf_applicable' => $this->lwf_applicable,
            'tds_regime' => $this->tds_regime,
            'gratuity_mode' => $this->gratuity_mode,
            
            // Bank Info (Partially Masked)
            'account_holder_name' => $this->account_holder_name,
            'bank_ifsc' => $this->bank_ifsc,
            'bank_name' => $this->bank_name,
            'bank_branch' => $this->bank_branch,
            'bank_account_number' => DataMasker::maskBankAccount($this->bank_account_number),
            
            // Sensitive Identity Fields (Masked)
            'pan_number' => DataMasker::maskIdentityNumber($this->pan_number),
            'aadhaar_number' => DataMasker::maskIdentityNumber($this->aadhaar_number),
            
            // Statutory IDs
            'uan_mode' => $this->uan_mode,
            'uan_number' => $this->uan_number,
            'esi_mode' => $this->esi_mode ?: 'new',
            'esic_number' => $this->esic_number,
            
            // F&F and Rules
            'lop_basis_days' => $this->lop_basis_days,
            'notice_period_days' => $this->notice_period_days,
            
            // Relations
            'salary_revisions' => $this->whenLoaded('salaryRevisions'),
            'documents' => $this->whenLoaded('documents'),
            
            // Computed Document Counts
            'documents_verified_count' => $this->documents_verified_count,
            'documents_required_count' => $this->documents_required_count,
        ];
    }
}
