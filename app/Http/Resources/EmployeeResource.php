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
        $calc = app(\App\Services\SalaryCalculationService::class)->calculateStructuralSalary($this->resource);
        $ptApplicable = $calc['pt_monthly'] > 0 || !empty($this->client?->pt_state) || (bool)$this->pt_applicable;

        return [
            'id' => $this->id,
            'employee_code' => $this->employee_code,
            'client_id' => $this->client_id,
            'client_name' => $this->relationLoaded('client') && $this->client ? $this->client->company_name : null,
            'branch_id' => $this->branch_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'father_name' => $this->father_name,
            'mother_name' => $this->mother_name,
            'spouse_name' => $this->spouse_name,
            'full_name' => $this->full_name,
            'personal_email' => $this->personal_email,
            'phone_number' => $this->phone_number,
            'date_of_birth' => $this->date_of_birth,
            'date_of_joining' => $this->date_of_joining,
            'probation_end_date' => $this->probation_end_date,
            'probationEndDate' => $this->probation_end_date,
            'attendance_tracking_start_date' => $this->attendance_tracking_start_date,
            'attendanceTrackingStartDate' => $this->attendance_tracking_start_date,
            'designation_id' => $this->designation_id,
            'designation' => $this->relationLoaded('designationMaster') && $this->designationMaster ? $this->designationMaster->name : ($this->designation ?? ''),
            'employment_model' => $this->employment_model,
            'prior_employment_flag' => $this->prior_employment_flag,
            'status' => $this->status,
            'gender' => $this->gender,
            'is_disabled' => (bool)$this->is_disabled,
            'disability_type' => $this->disability_type,
            'disability_percentage' => $this->disability_percentage,
            'udid_card_number' => $this->udid_card_number,
            'blood_group' => $this->blood_group,
            'marital_status' => $this->marital_status,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'residential_address' => $this->residential_address,
            
            // Numeric salary fields are NOT masked (Calculated live via SalaryCalculationService)
            'basic_pay' => $this->basic_pay,
            'hra' => $this->hra,
            'conveyance' => $this->conveyance,
            'da' => $this->da,
            'medical_allowance' => $this->medical_allowance,
            'special_allowance' => $this->special_allowance,
            'other_additions' => $this->other_additions,
            'gross_monthly_salary' => $calc['gross_monthly_salary'],
            'net_take_home_monthly' => $calc['net_take_home_monthly'],
            'employer_pf_monthly' => $calc['employer_pf_monthly'],
            'employer_epf_monthly' => $calc['employer_epf_monthly'],
            'employer_eps_monthly' => $calc['employer_eps_monthly'],
            'edli_monthly' => $calc['edli_monthly'],
            'epf_admin_monthly' => $calc['epf_admin_monthly'],
            'employer_esi_monthly' => $calc['employer_esi_monthly'],
            'ctc_monthly' => $calc['ctc_monthly'],
            'employee_pf_monthly' => $calc['employee_pf_monthly'],
            'employee_vpf_monthly' => $calc['employee_vpf_monthly'] ?? 0.00,
            'total_employee_pf_monthly' => $calc['total_employee_pf_monthly'] ?? round($calc['employee_pf_monthly'] + ($calc['employee_vpf_monthly'] ?? 0.00), 2),
            'employee_esi_monthly' => $calc['employee_esi_monthly'],
            'pt_monthly' => $calc['pt_monthly'],
            
            // Statutory settings & PF Basis
            'pf_applicable' => $this->pf_applicable !== null ? (bool)$this->pf_applicable : true,
            'eps_applicable' => $this->eps_applicable !== null ? (bool)$this->eps_applicable : true,
            'vpf_enabled' => (bool)$this->vpf_enabled,
            'vpf_type' => $this->vpf_type,
            'vpf_value' => $this->vpf_value !== null ? (float)$this->vpf_value : null,
            'employee_pf_wage_basis' => $this->employee_pf_wage_basis ?: ($this->relationLoaded('client') && $this->client ? ($this->client->employee_pf_wage_basis ?? 'ceiling') : 'ceiling'),
            'employer_pf_wage_basis' => $this->employer_pf_wage_basis ?: ($this->relationLoaded('client') && $this->client ? ($this->client->employer_pf_wage_basis ?? 'ceiling') : 'ceiling'),
            'joint_declaration_status' => $this->joint_declaration_status ?? 'not_required',
            'edli_exempted' => $this->relationLoaded('client') && $this->client ? (bool)$this->client->edli_exempted : false,
            'esi_applicable' => $this->esi_applicable !== null ? (bool)$this->esi_applicable : true,
            'is_esi_active' => ($calc['employee_esi_monthly'] > 0),
            'pt_applicable' => $ptApplicable,
            'tds_applicable' => $this->tds_applicable !== null ? (bool)$this->tds_applicable : true,
            'tds_regime' => $this->tds_regime,
            'gratuity_mode' => $this->gratuity_mode,
            'weekly_off_pattern' => $this->weekly_off_pattern ?: ($this->client ? $this->client->weekly_off_pattern : 'sat,sun'),
            'weeklyOffPattern' => $this->weekly_off_pattern ?: ($this->client ? $this->client->weekly_off_pattern : 'sat,sun'),
            
            // Health / Medical Insurance (For Non-ESI employees)
            'health_insurance_provider' => $this->health_insurance_provider,
            'health_insurance_policy_no' => $this->health_insurance_policy_no,
            'health_insurance_sum_insured' => $this->health_insurance_sum_insured,
            'client_health_insurance_enabled' => $this->relationLoaded('client') && $this->client ? (bool)$this->client->health_insurance_enabled : true,
            
            // Bank Info (Partially Masked & Raw)
            'account_holder_name' => $this->account_holder_name,
            'bank_ifsc' => $this->bank_ifsc,
            'bank_name' => $this->bank_name,
            'bank_branch' => $this->bank_branch,
            'bank_account_number' => DataMasker::maskBankAccount($this->bank_account_number),
            'raw_bank_account_number' => $this->bank_account_number,
            
            // Sensitive Identity Fields (Masked & Raw)
            'pan_number' => DataMasker::maskIdentityNumber($this->pan_number),
            'raw_pan_number' => $this->pan_number,
            'aadhaar_number' => DataMasker::maskIdentityNumber($this->aadhaar_number),
            'raw_aadhaar_number' => $this->aadhaar_number,
            
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
            
            // User & Invitation Status
            'user' => $this->user ? [
                'id' => $this->user->id,
                'status' => $this->user->status,
                'last_login_at' => $this->user->last_login_at,
                'invitation_accepted_at' => $this->user->invitation_accepted_at,
            ] : null,
            'has_logged_in' => (bool)($this->user && (!empty($this->user->last_login_at) || !empty($this->user->invitation_accepted_at) || $this->user->status === 'active')),
            'invitation_pending' => (bool)(!$this->user || ($this->user->status === 'invited' && empty($this->user->invitation_accepted_at) && empty($this->user->last_login_at))),
            'has_pending_revision' => $this->relationLoaded('salaryRevisions')
                ? $this->salaryRevisions->where('status', 'pending_approval')->count() > 0
                : \App\Models\SalaryRevision::where('employee_id', $this->id)->where('status', 'pending_approval')->exists(),

            // Computed Document Counts
            'documents_verified_count' => $this->documents_verified_count,
            'documents_required_count' => $this->documents_required_count,

            // Audit Trail
            'created_by' => $this->created_by,
            'creator_name' => $this->relationLoaded('creator') && $this->creator 
                ? $this->creator->name 
                : ($this->entry_source === 'bulk_upload' ? 'Bulk Upload' : ($this->created_by ? 'User #' . $this->created_by : 'System Admin')),
            'entry_source' => $this->entry_source ?: 'manual',
        ];
    }
}
