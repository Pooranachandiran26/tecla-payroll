<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Traits\BlameableTrait;

class Employee extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes, BlameableTrait;

    const BASE_REQUIRED_DOCUMENT_TYPES = [
        'pan_card', 'aadhaar_card', 'bank_passbook', 'offer_letter', 'photo'
    ];

    const CONDITIONAL_DOCUMENT_TYPES = [
        'relieving_letter', 'previous_payslips', 'form16'
    ];

    protected $guarded = [];

    protected $attributes = [
        'entry_source' => 'manual',
    ];

    protected $casts = [
        'bank_account_number' => 'encrypted',
        'pan_number' => 'encrypted',
        'aadhaar_number' => 'encrypted',
        'eps_applicable' => 'boolean',
        'pf_applicable' => 'boolean',
        'vpf_enabled' => 'boolean',
        'vpf_value' => 'float',
        'is_disabled' => 'boolean',
        'disability_percentage' => 'integer',
        'health_insurance_sum_insured' => 'float',
    ];

    protected static function booted()
    {
        static::saving(function ($employee) {
            if (!empty($employee->first_name) || !empty($employee->last_name)) {
                $employee->full_name = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));
            }
        });
    }

    public function getFullNameAttribute($value)
    {
        if (!empty($value)) {
            return $value;
        }
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''));
    }

    public function user()
    {
        return $this->hasOne(User::class, 'employee_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function branch()
    {
        return $this->belongsTo(ClientBranch::class, 'branch_id');
    }

    public function salaryRevisions()
    {
        return $this->hasMany(SalaryRevision::class);
    }

    public function exitRequest()
    {
        return $this->hasOne(EmployeeExit::class)->latestOfMany();
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function attendanceOverrides()
    {
        return $this->hasMany(EmployeeAttendanceOverride::class);
    }

    public function getRequiredDocumentTypesAttribute()
    {
        $types = self::BASE_REQUIRED_DOCUMENT_TYPES;
        if ($this->prior_employment_flag) {
            $types = array_merge($types, self::CONDITIONAL_DOCUMENT_TYPES);
        }
        return $types;
    }

    public function getDocumentsRequiredCountAttribute()
    {
        return count($this->required_document_types);
    }

    public function getDocumentsVerifiedCountAttribute()
    {
        if ($this->relationLoaded('documents')) {
            return $this->documents
                ->whereIn('document_type', $this->required_document_types)
                ->where('status', 'verified')
                ->count();
        }

        return $this->documents()
            ->whereIn('document_type', $this->required_document_types)
            ->where('status', 'verified')
            ->count();
    }

    public function checkAndPerformAutoActivation(): bool
    {
        if ($this->status !== 'onboarding') {
            return false;
        }

        $this->load('documents');

        if ($this->documents_verified_count >= $this->documents_required_count) {
            if ((bool)$this->pf_applicable && empty(trim($this->uan_number ?? ''))) {
                return false;
            }

            $this->update(['status' => 'active']);

            if ($this->personal_email) {
                try {
                    \Illuminate\Support\Facades\Mail::to($this->personal_email)
                        ->queue(new \App\Mail\ProfileActivatedMail($this->full_name));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error("ProfileActivatedMail error: " . $e->getMessage());
                }
            }

            try {
                $auditService = app(\App\Services\AuditService::class);
                $auditService->log(
                    'employee.auto_activated',
                    auth()->user() ?? null,
                    $this,
                    ['status' => 'onboarding'],
                    ['status' => 'active'],
                    ['reason' => 'All required documents verified and UAN provided']
                );
            } catch (\Throwable $e) {}

            return true;
        }

        return false;
    }

    public function loans()
    {
        return $this->hasMany(EmployeeLoan::class);
    }

    public function activeLoansEmiSumForMonth($payrollMonth)
    {
        $monthEnd = \Carbon\Carbon::parse($payrollMonth)->endOfMonth()->toDateString();

        return (float) $this->loans()
            ->where('status', 'active')
            ->where('remaining_balance', '>', 0)
            ->where('start_date', '<=', $monthEnd)
            ->sum('monthly_emi');
    }

    public function getEmployeePfMonthlyAttribute()
    {
        if (!$this->pf_applicable) return 0.00;
        $pfCeiling = (float) ($this->client?->pf_ceiling ?? \App\Services\SalaryCalculationService::PF_WAGE_CEILING);
        if ($pfCeiling <= 0) {
            $pfCeiling = \App\Services\SalaryCalculationService::PF_WAGE_CEILING;
        }
        $empBasis = $this->employee_pf_wage_basis ?: ($this->client?->employee_pf_wage_basis ?? 'ceiling');
        $basicDa = (float)$this->basic_pay + (float)($this->da ?? 0);
        $pfWage = ($empBasis === 'actual_basic_da') ? $basicDa : min($basicDa, $pfCeiling);
        return round($pfWage * 0.12, 2);
    }

    public function getEmployeeVpfMonthlyAttribute()
    {
        if (!$this->pf_applicable || !$this->vpf_enabled) return 0.00;
        $basicDa = (float)$this->basic_pay + (float)($this->da ?? 0);
        if ($this->vpf_type === 'percentage' && $this->vpf_value > 0) {
            $vpfRate = min(88.0, (float)$this->vpf_value);
            return round($basicDa * ($vpfRate / 100), 2);
        } elseif ($this->vpf_type === 'fixed_amount' && $this->vpf_value > 0) {
            $maxVpf = max(0.00, $basicDa - $this->employee_pf_monthly);
            return round(min((float)$this->vpf_value, $maxVpf), 2);
        }
        return 0.00;
    }

    public function getEmployeeTotalPfMonthlyAttribute()
    {
        return round($this->employee_pf_monthly + $this->employee_vpf_monthly, 2);
    }

    public function getEmployeeEsiMonthlyAttribute()
    {
        if (!$this->esi_applicable) return 0.00;
        $gross = (float)$this->gross_monthly_salary;
        $esiLimit = (bool)$this->is_disabled 
            ? \App\Services\SalaryCalculationService::ESI_DISABILITY_WAGE_CEILING 
            : \App\Services\SalaryCalculationService::ESI_WAGE_CEILING;
        return $gross <= $esiLimit ? round($gross * 0.0075, 2) : 0.00;
    }
}
