<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Traits\BlameableTrait;

class Client extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;
    protected $guarded = [];

    protected $attributes = [
        'weekly_off_pattern' => 'sat,sun',
    ];

    protected static function booted()
    {
        static::saving(function ($client) {
            $agencyTds = $client->tds_applicable_on_agency_fee;
            if ($agencyTds !== null && $agencyTds !== '') {
                if (is_numeric($agencyTds) && (float)$agencyTds > 0) {
                    $client->client_tds_percentage = (float) $agencyTds;
                } elseif ($agencyTds === 'na') {
                    $client->client_tds_percentage = null;
                }
            }
        });
    }

    /**
     * Fields safe to include in watcher notification emails.
     * Encrypted/PII fields (pan_number, gstin, etc.) are deliberately excluded.
     */
    const NOTIFIABLE_FIELDS = [
        'company_name',
        'client_code',
        'industry',
        'contract_type',
        'contract_start_date',
        'contract_end_date',
        'billing_model',
        'status',
        'auto_renewal',
        'notice_period_days',
        'account_manager_id',
        'backup_account_manager_id',
        'payment_net_terms',
        'invoice_cycle',
        'sla_tier',
        'client_portal_enabled',
    ];

    protected $casts = [
        'pan_number' => 'encrypted',
        'gstin' => 'encrypted',
        'edli_exempted' => 'boolean',
        'pf_applicable' => 'boolean',
        'statutory_bonus_applicable' => 'boolean',
        'gratuity_applicable' => 'boolean',
        'health_insurance_enabled' => 'boolean',
        'payslip_visible_sections' => 'array',
        'po_validity_date' => 'date',
        'po_value' => 'decimal:2',
        'pref_format_pdf' => 'boolean',
        'pref_format_xlsx' => 'boolean',
        'client_tds_percentage' => 'float',
        'hourly_rate' => 'float',
        'onboarding_completed_steps' => 'array',
        'onboarding_current_step' => 'integer',
        'applicable_statutory_acts' => 'array',
    ];


    public function getPayslipVisibleSectionsAttribute($value)
    {
        $defaults = [
            'show_pf_details' => true,
            'show_esi_details' => true,
            'show_pt_details' => true,
            'show_lwf_details' => true,
            'show_bank_details' => true,
            'show_attendance_summary' => true,
            'show_organisation_address' => true,
            'show_logo' => true,
            'show_signature_details' => true,
            'show_lop_deduction' => true,
            'show_tds_deduction' => true,
            'show_net_in_words' => true,
            'font_family' => 'Helvetica Neue',
            'font_size' => 'normal',
        ];

        if (!$value) {
            return $defaults;
        }

        $decoded = is_string($value) ? json_decode($value, true) : $value;
        return array_merge($defaults, is_array($decoded) ? $decoded : []);
    }

    public function getDecryptedGstinAttribute(): ?string
    {
        try {
            return $this->gstin;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function getFormattedRegisteredAddressAttribute(): string
    {
        $parts = array_filter([
            $this->registered_address_line_1,
            $this->registered_address_line_2,
            $this->registered_city,
            $this->registered_state,
            $this->registered_pin ? "PIN: {$this->registered_pin}" : null,
        ]);
        return implode(', ', $parts);
    }

    public function industryMaster()
    {
        return $this->belongsTo(\App\Models\Masters\MasIndustry::class, 'industry_id');
    }

    public function contacts()
    {
        return $this->hasMany(ClientContact::class);
    }

    public function branches()
    {
        return $this->hasMany(ClientBranch::class);
    }

    public function documents()
    {
        return $this->hasMany(ClientDocument::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function holidays()
    {
        return $this->hasMany(Holiday::class);
    }



    public function accountManager()
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function backupAccountManager()
    {
        return $this->belongsTo(User::class, 'backup_account_manager_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Compute the payroll cycle start date for a given payroll month.
     *
     * @param string $payrollMonth  e.g. "2026-07-01"
     * @return \Carbon\Carbon
     */
    public function getCycleStartDate(string $payrollMonth): \Carbon\Carbon
    {
        $month = \Carbon\Carbon::parse($payrollMonth)->startOfDay();

        if (in_array($this->payroll_convention, ['custom', 'custom_cycle'])) {
            $startDay = (int) $this->custom_cycle_start_day ?: 1;
            $endDay = (int) $this->custom_cycle_end_day ?: 28;

            if ($startDay <= $endDay) {
                $clampedDay = min($startDay, $month->daysInMonth);
                return $month->copy()->day($clampedDay);
            } else {
                $prevMonth = $month->copy()->subMonth();
                $clampedDay = min($startDay, $prevMonth->daysInMonth);
                return $prevMonth->copy()->day($clampedDay);
            }
        }

        return $month->copy()->startOfMonth();
    }

    /**
     * Compute the payroll cycle end date for a given payroll month.
     *
     * @param string $payrollMonth  e.g. "2026-07-01"
     * @return \Carbon\Carbon
     */
    public function getCycleEndDate(string $payrollMonth): \Carbon\Carbon
    {
        $month = \Carbon\Carbon::parse($payrollMonth)->startOfDay();

        if (in_array($this->payroll_convention, ['custom', 'custom_cycle'])) {
            $endDay = (int) $this->custom_cycle_end_day ?: 28;
            $clampedDay = min($endDay, $month->daysInMonth);
            return $month->copy()->day($clampedDay);
        }

        return $month->copy()->endOfMonth();
    }

    /**
     * Compute target lock date (Day of next calendar month).
     *
     * @param string $payrollMonth
     * @return string|null
     */
    public function getTargetLockDate(string $payrollMonth): ?string
    {
        if (empty($this->payroll_lock_day)) {
            return null;
        }

        $month = \Carbon\Carbon::parse($payrollMonth)->startOfDay();
        $val = (string) $this->payroll_lock_day;

        if (str_contains($val, 'current')) {
            if ($val === 'eom_current' || $val === 'eom') {
                return $month->endOfMonth()->format('M j, Y');
            }
            $day = (int) filter_var($val, FILTER_SANITIZE_NUMBER_INT);
            $clampedDay = min($day ?: 28, $month->daysInMonth);
            return $month->copy()->day($clampedDay)->format('M j, Y');
        }

        // Next month
        $target = $month->copy()->addMonth();
        if ($val === 'eom' || $val === 'eom_next') {
            return $target->endOfMonth()->format('M j, Y');
        }

        $day = (int) filter_var($val, FILTER_SANITIZE_NUMBER_INT);
        $clampedDay = min($day ?: 3, $target->daysInMonth);
        return $target->day($clampedDay)->format('M j, Y');
    }

    /**
     * Compute target salary credit date (Day of current or next calendar month).
     *
     * @param string $payrollMonth
     * @return string|null
     */
    public function getTargetSalaryCreditDate(string $payrollMonth): ?string
    {
        if (empty($this->salary_credit_day)) {
            return null;
        }

        $month = \Carbon\Carbon::parse($payrollMonth)->startOfDay();
        $val = (string) $this->salary_credit_day;

        if (str_contains($val, 'current')) {
            if ($val === 'eom_current' || $val === 'eom') {
                return $month->endOfMonth()->format('M j, Y');
            }
            $day = (int) filter_var($val, FILTER_SANITIZE_NUMBER_INT);
            $clampedDay = min($day ?: 30, $month->daysInMonth);
            return $month->copy()->day($clampedDay)->format('M j, Y');
        }

        // Next month
        $target = $month->copy()->addMonth();
        if ($val === 'eom' || $val === 'eom_next') {
            return $target->endOfMonth()->format('M j, Y');
        }

        $day = (int) filter_var($val, FILTER_SANITIZE_NUMBER_INT);
        $clampedDay = min($day ?: 7, $target->daysInMonth);
        return $target->day($clampedDay)->format('M j, Y');
    }

    /**
     * Check if the client is an internal in-house entity (no client billing/invoicing).
     */
    public function isInhouse(): bool
    {
        return $this->billing_model === 'inhouse';
    }
}


