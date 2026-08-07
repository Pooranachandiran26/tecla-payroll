<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\ClientDocument;

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
            'company_name' => $this->name ?: $this->company_name,
            'company_type' => $this->type ?: $this->company_type,
            'client_code' => $this->code ?: $this->client_code,
            'trust_registration_number' => $this->trustRegNo ?: $this->trust_registration_number,
            'pan_number' => $this->pan ?: $this->pan_number,
            'industry' => $this->industry,
            'status' => $this->status ?: 'onboarding',
            'country' => $this->country ?: 'India',
            'cin_number' => $this->cin ?: $this->cin_number,
            'incorporation_date' => $this->incorporationDate ?: $this->incorporation_date,
            'logo_path' => $this->logoUrl ?: $this->logo_path,
            'display_name_override' => $this->displayNameOverride ?: $this->display_name_override,
            'accent_color' => $this->accentColor ?: $this->accent_color,
            
            // Address
            'registered_address_line_1' => $this->regAddressLine1 ?: $this->registered_address_line_1,
            'registered_address_line_2' => $this->regAddressLine2 ?: $this->registered_address_line_2,
            'registered_city' => $this->regCity ?: $this->registered_city,
            'registered_state' => $this->regState ?: $this->registered_state,
            'registered_pin' => $this->regPin ?: $this->registered_pin ?: $this->registered_pin_code,
            'tax_id' => $this->taxId ?: $this->tax_id,
            'tan_number' => $this->tan ?: $this->tan_number,
            'registration_number' => $this->regNo ?: $this->registration_number,
            
            // Contract & Billing
            'contract_type' => $this->contractType ?: $this->contract_type,
            'billing_model' => $this->billingModel ?: $this->billing_model,
            'markup_percentage' => $this->markupPct ?: $this->markup_percentage,
            'fixed_fee_amount' => $this->fixedFeeAmount !== null ? $this->fixedFeeAmount : $this->fixed_fee_amount,
            'hourly_rate' => $this->hourlyRate !== null ? $this->hourlyRate : $this->hourly_rate,
            'work_locations_count' => $this->locationsCount !== null ? $this->locationsCount : ($this->work_locations_count ?? 1),
            'contract_start_date' => $this->contractStart ?: $this->contract_start_date,
            'contract_end_date' => $this->contractEnd ?: $this->contract_end_date,
            
            'ot_billing_rule' => $this->otBilling,
            'payment_net_terms' => $this->paymentTerms,
            'credit_limit' => $this->creditLimit !== null ? $this->creditLimit : ($this->route('client')?->credit_limit ?? 0),
            'late_payment_penalty_pct' => $this->latePenalty !== null ? $this->latePenalty : ($this->route('client')?->late_payment_penalty_pct ?? 0),
            'invoice_cycle' => $this->invoiceCycle,
            'currency' => $this->billingCurrency ?: 'INR',
            'tds_applicable_on_agency_fee' => $this->tdsApplicableAgency === 'other'
                ? ($this->customTdsPercentage ?: $this->clientTdsPercentage ?: 'other')
                : $this->tdsApplicableAgency,
            'client_tds_percentage' => (function() {
                $custom = $this->customTdsPercentage ?? $this->clientTdsPercentage ?? $this->client_tds_percentage;
                if ($custom !== null && $custom !== '' && is_numeric($custom)) {
                    return (float) $custom;
                }
                $agencyVal = $this->tdsApplicableAgency ?? $this->tds_applicable_on_agency_fee;
                if (is_numeric($agencyVal) && (float)$agencyVal > 0) {
                    return (float) $agencyVal;
                }
                return null;
            })(),
            'po_required' => $this->poRequired ? 1 : 0,
            'po_number' => $this->poNumber,
            'po_value' => $this->poValue,
            'po_validity_date' => $this->poValidity,
            'invoice_footer_notes' => $this->invoiceFooterNotes,
            'pref_format_pdf' => $this->has('prefFormatPDF') ? ($this->boolean('prefFormatPDF') ? 1 : 0) : ($this->route('client')?->pref_format_pdf ? 1 : 0),
            'pref_format_xlsx' => $this->has('prefFormatXLSX') ? ($this->boolean('prefFormatXLSX') ? 1 : 0) : ($this->route('client')?->pref_format_xlsx ? 1 : 0),
            'auto_renewal' => $this->autoRenewal ? 1 : 0,
            'notice_period_days' => $this->noticePeriod !== null ? $this->noticePeriod : ($this->route('client')?->notice_period_days ?? 30),
            
            // Statutory
            'pt_state' => $this->ptState,
            'default_gratuity_mode' => (function($mode) {
                if (!is_string($mode)) return 'ctc_included';
                $map = ['payable_on_separation' => 'over_ctc', 'over_and_above' => 'over_ctc', 'over_ctc' => 'over_ctc', 'ctc_included' => 'ctc_included', 'part_of_ctc' => 'ctc_included', 'not_applicable' => 'na', 'na' => 'na'];
                return $map[$mode] ?? $mode;
            })($this->gratuityMode ?: $this->default_gratuity_mode),
            'gratuity_applicable' => $this->gratuityApplicable ? 1 : 0,
            'statutory_bonus_applicable' => $this->statutoryBonusApplicable ? 1 : 0,
            'health_insurance_enabled' => $this->has('healthInsuranceEnabled')
                ? ($this->boolean('healthInsuranceEnabled') ? 1 : 0)
                : ($this->has('health_insurance_enabled')
                    ? ($this->boolean('health_insurance_enabled') ? 1 : 0)
                    : ($this->route('client')?->health_insurance_enabled ? 1 : 0)),
            'bonus_rate_percentage' => $this->bonusRate !== null ? $this->bonusRate : ($this->route('client')?->bonus_rate_percentage ?? 8.33),
            'pf_ceiling' => $this->pfCeiling !== null ? $this->pfCeiling : ($this->route('client')?->pf_ceiling ?? 15000),
            'employee_pf_wage_basis' => $this->employeePfWageBasis ?? $this->employee_pf_wage_basis ?? ($this->route('client')?->employee_pf_wage_basis ?? 'ceiling'),
            'employer_pf_wage_basis' => $this->employerPfWageBasis ?? $this->employer_pf_wage_basis ?? ($this->route('client')?->employer_pf_wage_basis ?? 'ceiling'),
            'pf_applicable' => $this->pfApplicable ? 1 : 0,
            'edli_exempted' => $this->edliExempted ? 1 : 0,
            'esi_limit' => $this->esiLimit !== null ? $this->esiLimit : ($this->route('client')?->esi_limit ?? 21000),
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
            'portal_session_timeout' => $this->sessionTimeout !== null ? $this->sessionTimeout : ($this->route('client')?->portal_session_timeout ?? 60),
            'portal_ip_whitelist' => $this->ipWhitelist,
            
            'cutoff_day' => $this->attendanceCutoff,
            'custom_cycle_start_day' => $this->cycleStartDay !== null ? $this->cycleStartDay : ($this->route('client')?->custom_cycle_start_day ?? 1),
            'custom_cycle_end_day' => $this->cycleEndDay !== null ? $this->cycleEndDay : ($this->route('client')?->custom_cycle_end_day ?? 28),
            'payroll_lock_day' => $this->payrollLockDay,
            'salary_credit_day' => $this->salaryCreditDay,
            'invoice_dispute_window_days' => $this->invoiceDisputeDays,
            'invoice_raise_day' => $this->invoiceRaiseDay,
            'payroll_convention' => $this->payrollMonthConvention,
            'lop_basis_days' => '30',
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
                'is_whatsapp_same' => isset($this->poc1['whatsappSame']) ? (bool)$this->poc1['whatsappSame'] : true,
                'preference_email' => isset($this->poc1['prefs']['email']) ? (bool)$this->poc1['prefs']['email'] : true,
                'preference_sms' => isset($this->poc1['prefs']['sms']) ? (bool)$this->poc1['prefs']['sms'] : false,
                'preference_whatsapp' => isset($this->poc1['prefs']['wa']) ? (bool)$this->poc1['prefs']['wa'] : false,
                'communication_preferences' => $this->poc1['preferences'] ?? ['Email'],
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
                'is_whatsapp_same' => isset($this->poc2['whatsappSame']) ? (bool)$this->poc2['whatsappSame'] : true,
                'cc_on_invoice' => isset($this->poc2['ccInvoice']) ? (bool)$this->poc2['ccInvoice'] : false,
                'preference_email' => isset($this->poc2['prefs']['email']) ? (bool)$this->poc2['prefs']['email'] : true,
                'preference_sms' => isset($this->poc2['prefs']['sms']) ? (bool)$this->poc2['prefs']['sms'] : false,
                'preference_whatsapp' => isset($this->poc2['prefs']['wa']) ? (bool)$this->poc2['prefs']['wa'] : false,
                'communication_preferences' => $this->poc2['preferences'] ?? ['Email'],
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
                'is_whatsapp_same' => isset($this->poc3['whatsappSame']) ? (bool)$this->poc3['whatsappSame'] : true,
                'receive_onboarding_kits' => isset($this->poc3['onboardingKits']) ? (bool)$this->poc3['onboardingKits'] : false,
                'preference_email' => isset($this->poc3['prefs']['email']) ? (bool)$this->poc3['prefs']['email'] : true,
                'preference_sms' => isset($this->poc3['prefs']['sms']) ? (bool)$this->poc3['prefs']['sms'] : false,
                'preference_whatsapp' => isset($this->poc3['prefs']['wa']) ? (bool)$this->poc3['prefs']['wa'] : false,
                'communication_preferences' => $this->poc3['preferences'] ?? ['Email'],
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
                    'is_whatsapp_same' => isset($extra['whatsappSame']) ? (bool)$extra['whatsappSame'] : true,
                    'preference_email' => isset($extra['prefs']['email']) ? (bool)$extra['prefs']['email'] : true,
                    'preference_sms' => isset($extra['prefs']['sms']) ? (bool)$extra['prefs']['sms'] : false,
                    'preference_whatsapp' => isset($extra['prefs']['wa']) ? (bool)$extra['prefs']['wa'] : false,
                    'communication_preferences' => $extra['preferences'] ?? ['Email'],
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
                
                // SUGGESTION: This is a deliberate, temporary decision. If the business ever needs a branch 
                // to be the head office but *not* the billing branch (or vice versa), the frontend will need 
                // a second checkbox and this mapping will need to be split apart.
                $mappedBranches[] = [
                    'id' => $branch['id'] ?? null,
                    'branch_code' => $branch['code'] ?? null,
                    'branch_name' => $branch['name'] ?? null,
                    'address_line_1' => $branch['addr1'] ?? null,
                    'city' => $branch['city'] ?? null,
                    'state' => $stateName,
                    'pin_code' => $branch['pin'] ?? null,
                    'is_head_office' => ($branch['isPrimary'] ?? false) ? 1 : 0,
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
        $clientParam = $this->route('client');
        $clientId = is_object($clientParam) ? $clientParam->id : $clientParam;
        return [
            // Step 1
            'company_name' => 'required|string|max:255',
            'client_code' => 'required|string|unique:clients,client_code,' . $clientId,
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
            'billing_model' => 'required|in:markup,fixed_per_candidate,fixed_per_month,lumpsum,hourly,inhouse',
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'nullable|date|after:contract_start_date',
            'markup_percentage' => 'nullable|required_if:billing_model,markup|numeric|min:0|max:100',
            'fixed_fee_amount' => 'required_if:billing_model,fixed_per_candidate,fixed_per_month,lumpsum|nullable|numeric|min:0',
            'hourly_rate' => 'required_if:billing_model,hourly|nullable|numeric|min:0',
            'ot_billing_rule' => 'nullable|string',
            'payment_net_terms' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'late_payment_penalty_pct' => 'nullable|numeric|min:0|max:100',
            'invoice_cycle' => 'nullable|string',
            'currency' => 'nullable|string',
            'tds_applicable_on_agency_fee' => 'nullable|string',
            'client_tds_percentage' => 'nullable|numeric|min:0|max:100',
            'po_required' => 'nullable|boolean',
            'po_number' => 'nullable|string',
            'po_value' => 'nullable|numeric|min:0',
            'po_validity_date' => 'nullable|date',
            'invoice_footer_notes' => 'nullable|string|max:1000',
            'pref_format_pdf' => 'nullable|boolean',
            'pref_format_xlsx' => 'nullable|boolean',
            'auto_renewal' => 'nullable|boolean',
            'notice_period_days' => 'nullable|integer|min:0',
            
            // Statutory
            'pt_state' => 'nullable|string',
            'default_gratuity_mode' => 'nullable|string',
            'gratuity_applicable' => 'nullable|boolean',
            'statutory_bonus_applicable' => 'nullable|boolean',
            'health_insurance_enabled' => 'nullable|boolean',
            'bonus_rate_percentage' => 'nullable|numeric|min:0|max:100',
            'pf_ceiling' => 'nullable|numeric|min:0|max:15000',
            'employee_pf_wage_basis' => 'nullable|string|in:ceiling,actual_basic_da',
            'employer_pf_wage_basis' => 'nullable|string|in:ceiling,actual_basic_da',
            'pf_applicable' => 'nullable|boolean',
            'edli_exempted' => 'nullable|boolean',
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
            'contacts.*.is_whatsapp_same' => 'nullable|boolean',
            'contacts.*.cc_on_invoice' => 'nullable|boolean',
            'contacts.*.receive_onboarding_kits' => 'nullable|boolean',
            'contacts.*.preference_email' => 'nullable|boolean',
            'contacts.*.preference_sms' => 'nullable|boolean',
            'contacts.*.preference_whatsapp' => 'nullable|boolean',
            'contacts.*.communication_preferences' => 'nullable|array',

            // Branches
            'branches' => 'nullable|array',
            'branches.*.id' => 'nullable',
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

            'pt_state' => 'nullable|string',
            'default_gratuity_mode' => 'nullable|string',
            'statutory_bonus_applicable' => 'nullable|boolean',

            // Documents (if they upload during edit)
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
