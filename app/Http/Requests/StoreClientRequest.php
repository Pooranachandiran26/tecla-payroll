<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\ClientDocument;

class StoreClientRequest extends FormRequest
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
        \Illuminate\Support\Facades\Log::info('StoreClientRequest payload received', $this->all());

        $mapped = [
            'company_name' => $this->name,
            'company_type' => $this->type,
            'client_code' => $this->code,
            'trust_registration_number' => $this->trustRegNo,
            'pan_number' => $this->pan,
            'industry' => $this->industry,
            'status' => $this->status ?: 'onboarding',
            'country' => $this->country ?: 'India',
            'cin_number' => $this->cin,
            'incorporation_date' => $this->incorporationDate,
            'logo_path' => $this->logoUrl,
            'display_name_override' => $this->displayNameOverride,
            'accent_color' => $this->accentColor,
            
            // Address
            'registered_address_line_1' => $this->regAddressLine1,
            'registered_address_line_2' => $this->regAddressLine2,
            'registered_city' => $this->regCity,
            'registered_state' => $this->regState,
            'registered_pin' => $this->regPin,
            'tax_id' => $this->taxId,
            'tan_number' => $this->tan,
            'registration_number' => $this->regNo,
            
            // Contract & Billing
            'contract_type' => $this->contractType,
            'billing_model' => $this->billingModel,
            'markup_percentage' => $this->markupPct,
            'fixed_fee_amount' => $this->fixedFeeCandidate,
            'work_locations_count' => $this->locationsCount,
            'contract_start_date' => $this->contractStart,
            'contract_end_date' => $this->contractEnd,
            
            'ot_billing_rule' => $this->otBilling,
            'payment_net_terms' => $this->paymentTerms,
            'credit_limit' => $this->creditLimit,
            'late_payment_penalty_pct' => $this->latePenalty,
            'invoice_cycle' => $this->invoiceCycle,
            'currency' => $this->billingCurrency ?: 'INR',
            'tds_applicable_on_agency_fee' => $this->tdsApplicableAgency,
            'po_required' => $this->poRequired ? 1 : 0,
            'po_number' => $this->poNumber,
            'auto_renewal' => $this->autoRenewal ? 1 : 0,
            'notice_period_days' => $this->noticePeriod ?? 30,
            
            // Statutory
            'pt_state' => $this->ptState,
            'default_gratuity_mode' => $this->gratuityMode ?: 'ctc_included',
            'gratuity_applicable' => $this->gratuityApplicable ? 1 : 0,
            'statutory_bonus_applicable' => $this->statutoryBonusApplicable ? 1 : 0,
            'bonus_rate_percentage' => $this->bonusRate ?? 8.33,
            'pf_ceiling' => $this->pfCeiling ?? 15000,
            'pf_applicable' => $this->pfApplicable ? 1 : 0,
            'esi_limit' => $this->esiLimit ?? 21000,
            'esi_applicable' => $this->esiApplicable ? 1 : 0,
            'pf_establishment_code' => $this->pfEstablishmentCode,
            'esi_code_number' => $this->esiCodeNumber,
            'lwf_frequency' => $this->lwfFrequency,
            'lwf_applicable' => $this->lwfApplicable ? 1 : 0,
            'tds_regime' => $this->tdsRegime,
            'tds_applicable' => $this->tdsApplicable ? 1 : 0,
            
            // Portal & SLA
            'client_portal_enabled' => $this->portalAccess ? 1 : 0,
            'portal_access_level' => $this->portalAccessLevel ?: 'view_only',
            'portal_primary_email' => $this->portalEmail,
            'portal_view_salary' => $this->portalViewSalary ? 1 : 0,
            'portal_view_invoices' => $this->portalViewInvoices ? 1 : 0,
            'portal_view_payslips' => $this->portalViewPayslips ? 1 : 0,
            'portal_raise_requests' => $this->portalRaiseRequests ? 1 : 0,
            'portal_require_2fa' => $this->portal2fa ? 1 : 0,
            'portal_session_timeout' => $this->sessionTimeout ?? 60,
            'portal_ip_whitelist' => $this->ipWhitelist,
            
            'cutoff_day' => $this->attendanceCutoff,
            'custom_cycle_start_day' => $this->cycleStartDay ?? 1,
            'custom_cycle_end_day' => $this->cycleEndDay ?? 28,
            'payroll_lock_day' => $this->payrollLockDay,
            'salary_credit_day' => $this->salaryCreditDay,
            'invoice_dispute_window_days' => $this->invoiceDisputeDays,
            'invoice_raise_day' => $this->invoiceRaiseDay,
            'payroll_convention' => $this->payrollMonthConvention,
            'lop_basis_days' => $this->lopBasis ?: '26',
            'weekly_off_pattern' => $this->weeklyOffPattern ?: $this->weekly_off_pattern ?: 'sat,sun',
            'auto_reminders' => $this->autoReminders ? 1 : 0,
            'client_notes' => $this->clientNotes,

            'account_manager_id' => $this->accountManager ?: null,
            'backup_account_manager_id' => $this->backupAM ?: null,
            'primary_poc_name' => $this->poc1['name'] ?? null,
            'primary_poc_email' => $this->poc1['email'] ?? null,
            'primary_poc_phone' => $this->poc1['phone'] ?? null,
        ];

        $contacts = [];
        if ($this->has('poc1') && (isset($this->poc1['name']) || isset($this->poc1['email']))) {
            $contacts[] = [
                'id' => $this->poc1['id'] ?? null,
                'contact_type' => 'primary',
                'full_name' => $this->poc1['name'] ?? null,
                'designation' => $this->poc1['designation'] ?? null,
                'email' => $this->poc1['email'] ?? null,
                'phone' => $this->poc1['phone'] ?? null,
            ];
        }
        if ($this->has('poc2') && (isset($this->poc2['name']) || isset($this->poc2['email']))) {
            $contacts[] = [
                'id' => $this->poc2['id'] ?? null,
                'contact_type' => 'finance',
                'full_name' => $this->poc2['name'] ?? null,
                'designation' => $this->poc2['designation'] ?? null,
                'email' => $this->poc2['email'] ?? null,
                'phone' => $this->poc2['phone'] ?? null,
            ];
        }
        if ($this->has('poc3') && (isset($this->poc3['name']) || isset($this->poc3['email']))) {
            $contacts[] = [
                'id' => $this->poc3['id'] ?? null,
                'contact_type' => 'hr',
                'full_name' => $this->poc3['name'] ?? null,
                'designation' => $this->poc3['designation'] ?? null,
                'email' => $this->poc3['email'] ?? null,
                'phone' => $this->poc3['phone'] ?? null,
            ];
        }
        if ($this->has('extraContacts') && is_array($this->extraContacts)) {
            foreach ($this->extraContacts as $extra) {
                $role = $extra['role'] ?? 'operations';
                $contacts[] = [
                    'id' => $extra['id'] ?? null,
                    'contact_type' => $role,
                    'full_name' => $extra['name'] ?? null,
                    'designation' => $extra['designation'] ?? null,
                    'email' => $extra['email'] ?? null,
                    'phone' => $extra['phone'] ?? null,
                ];
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
                    'id' => $branch['id'] ?? null,
                    'branch_code' => $branch['code'] ?? null,
                    'branch_name' => $branch['name'] ?? null,
                    'address_line_1' => $branch['addr1'] ?? null,
                    'city' => $branch['city'] ?? null,
                    'state' => $stateName,
                    'pin_code' => $branch['pin'] ?? null,
                    'is_head_office' => ($branch['isPrimary'] ?? false) ? 1 : 0, // SUGGESTION: Temporary mapping, split in UI if needed
                    'is_primary_billing_branch' => ($branch['isPrimary'] ?? false) ? 1 : 0,
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
        return [
            // Step 1
            'company_name' => 'required|string|max:255',
            'client_code' => 'required|string|unique:clients,client_code',
            'company_type' => 'required|in:pvt_ltd,pub_ltd,llp,opc,partnership,proprietorship,trust,govt',
            'pan_number' => ['nullable', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/'],
            'gstin' => ['nullable', 'string', 'size:15', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/'],
            'work_locations_count' => 'required|integer|min:1',
            'industry' => 'nullable|string|max:255',
            'status' => 'required|string|in:onboarding,active,inactive,suspended',
            'country' => 'nullable|string|max:100',
            'cin_number' => 'nullable|string|max:50',
            'incorporation_date' => 'nullable|date',
            'logo_path' => 'nullable|string',
            'display_name_override' => 'nullable|string|max:255',
            'accent_color' => ['nullable', 'string', 'regex:/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/'],
            'trust_registration_number' => 'nullable|string|max:100',
            
            // Step 2
            'registered_address_line_1' => 'required|string|max:255',
            'registered_address_line_2' => 'nullable|string|max:255',
            'registered_city' => 'required|string|max:100',
            'registered_state' => 'required|string|max:100',
            'registered_pin' => ['required', 'digits:6', 'regex:/^[1-9][0-9]{5}$/'],
            'tax_id' => 'nullable|string|max:100',
            'tan_number' => 'nullable|string|max:100',
            'registration_number' => 'nullable|string|max:100',
            
            // Step 4
            'contract_type' => 'required|in:agency,eor',
            'billing_model' => 'required|in:markup,fixed_per_candidate,fixed_per_month,lumpsum,hourly',
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'nullable|date|after:contract_start_date',
            'markup_percentage' => 'nullable|required_if:billing_model,markup|numeric|min:0|max:100',
            'fixed_fee_amount' => 'nullable|required_if:billing_model,fixed_per_candidate|numeric|min:0',
            'ot_billing_rule' => 'nullable|string',
            'payment_net_terms' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'late_payment_penalty_pct' => 'nullable|numeric|min:0|max:100',
            'invoice_cycle' => 'nullable|string',
            'currency' => 'nullable|string',
            'tds_applicable_on_agency_fee' => 'nullable|string',
            'po_required' => 'nullable|boolean',
            'po_number' => 'nullable|string',
            'auto_renewal' => 'nullable|boolean',
            'notice_period_days' => 'nullable|integer|min:0',
            
            // Statutory
            'pt_state' => 'nullable|string',
            'default_gratuity_mode' => 'nullable|string',
            'gratuity_applicable' => 'nullable|boolean',
            'statutory_bonus_applicable' => 'nullable|boolean',
            'bonus_rate_percentage' => 'nullable|numeric|min:0|max:100',
            'pf_ceiling' => 'nullable|numeric|min:0',
            'pf_applicable' => 'nullable|boolean',
            'esi_limit' => 'nullable|numeric|min:0',
            'esi_applicable' => 'nullable|boolean',
            'pf_establishment_code' => 'nullable|string|max:255',
            'esi_code_number' => 'nullable|string|max:255',
            'lwf_frequency' => 'nullable|string',
            'lwf_applicable' => 'nullable|boolean',
            'tds_regime' => 'nullable|string',
            'tds_applicable' => 'nullable|boolean',
            
            // Portal & SLA
            'client_portal_enabled' => 'nullable|boolean',
            'portal_access_level' => 'nullable|string',
            'portal_primary_email' => 'nullable|email',
            'portal_view_salary' => 'nullable|boolean',
            'portal_view_invoices' => 'nullable|boolean',
            'portal_view_payslips' => 'nullable|boolean',
            'portal_raise_requests' => 'nullable|boolean',
            'portal_require_2fa' => 'nullable|boolean',
            'portal_session_timeout' => 'nullable|integer|min:1',
            'portal_ip_whitelist' => 'nullable|string',
            
            'cutoff_day' => 'nullable|string',
            'custom_cycle_start_day' => 'nullable|integer|min:1|max:31',
            'custom_cycle_end_day' => 'nullable|integer|min:1|max:31',
            'payroll_lock_day' => 'nullable|string',
            'salary_credit_day' => 'nullable|string',
            'invoice_dispute_window_days' => 'nullable|integer|min:0|max:180',
            'invoice_raise_day' => 'nullable|string',
            'payroll_convention' => 'nullable|string',
            'lop_basis_days' => 'nullable|integer|min:15|max:31',
            'weekly_off_pattern' => ['nullable', 'string', 'regex:/^(mon|tue|wed|thu|fri|sat|sun)(,(mon|tue|wed|thu|fri|sat|sun)){0,6}$/i'],
            'auto_reminders' => 'nullable|boolean',
            'client_notes' => 'nullable|string',
            
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
            'contacts.*.id' => 'nullable|integer',
            'contacts.*.contact_type' => 'required|string',
            'contacts.*.full_name' => 'required|string',
            'contacts.*.designation' => 'nullable|string',
            'contacts.*.email' => 'required|email',
            'contacts.*.phone' => ['required', 'regex:/^[6-9][0-9]{9}$/'],

            // Branches
            'branches' => 'nullable|array',
            'branches.*.id' => 'nullable|string',
            'branches.*.branch_code' => 'nullable|string',
            'branches.*.branch_name' => 'nullable|string',
            'branches.*.address_line_1' => 'nullable|string',
            'branches.*.city' => 'nullable|string',
            'branches.*.state' => 'nullable|string',
            'branches.*.pin_code' => 'nullable|string',
            'branches.*.is_head_office' => 'nullable|boolean',
            'branches.*.is_primary_billing_branch' => 'nullable|boolean',
            'branches.*.gstin' => ['nullable', 'string', 'size:15', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/'],
            'branches.*.gst_registration_type' => 'nullable|string',
            'branches.*.finance_poc_name' => 'nullable|string',
            'branches.*.finance_poc_email' => 'nullable|email',
            'branches.*.finance_poc_phone' => 'nullable|string',
            'branches.*.state_code' => 'nullable|string',

            // Top-level mapped fields for DB constraint
            'primary_poc_name' => 'nullable|string',
            'primary_poc_email' => 'nullable|email',
            'primary_poc_phone' => 'nullable|string',
            
            'account_manager_id' => 'nullable|exists:users,id',
            'backup_account_manager_id' => 'nullable|exists:users,id',

            // Documents
            'documents' => 'nullable|array',
            'documents.*.type' => ['required', Rule::in(ClientDocument::ALLOWED_TYPES)],
            'documents.*.file' => 'required|file|mimes:pdf,jpg,jpeg,png,xlsx,xls|max:10240',
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

            if (!empty($data['work_locations_count']) && $data['work_locations_count'] > 1) {
                if (empty($data['branches']) || !is_array($data['branches'])) {
                    $validator->errors()->add('branches', 'You must add at least one branch when Number of Work Locations is greater than 1.');
                }
            }

            // Branch GSTIN matching and primary billing branch uniqueness
            if (!empty($data['branches']) && is_array($data['branches'])) {
                $primaryBillingBranchCount = 0;
                
                foreach ($data['branches'] as $index => $branch) {
                    if (!empty($branch['is_primary_billing_branch'])) {
                        $primaryBillingBranchCount++;
                    }

                    if (!empty($branch['gstin']) && !empty($branch['state_code'])) {
                        $stateCode = str_pad($branch['state_code'], 2, '0', STR_PAD_LEFT);
                        if (substr($branch['gstin'], 0, 2) !== $stateCode) {
                            $validator->errors()->add("branches.{$index}.gstin", "Branch GSTIN must start with the correct state code ({$stateCode}).");
                        }
                    }
                }
                
                if ($primaryBillingBranchCount > 1) {
                    $validator->errors()->add("branches", "Only one branch can be set as the Primary Billing Branch.");
                }
            }
        });
    }
}
