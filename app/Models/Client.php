<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Client extends Model
{
    use HasFactory, SoftDeletes;
    protected $guarded = [];

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
    ];

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
        $target = $month->copy()->addMonth();

        $day = (int) $this->payroll_lock_day;
        $clampedDay = min($day, $target->daysInMonth);
        return $target->day($clampedDay)->format('M j, Y');
    }

    /**
     * Compute target salary credit date (Day of next calendar month).
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
        $target = $month->copy()->addMonth();

        if ($this->salary_credit_day === 'eom') {
            return $target->endOfMonth()->format('M j, Y');
        }

        $day = (int) $this->salary_credit_day;
        $clampedDay = min($day, $target->daysInMonth);
        return $target->day($clampedDay)->format('M j, Y');
    }
}


