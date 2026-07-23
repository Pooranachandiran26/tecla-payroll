<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Employee extends Model
{
    use HasFactory;
    use \Illuminate\Database\Eloquent\SoftDeletes;

    const BASE_REQUIRED_DOCUMENT_TYPES = [
        'pan_card', 'aadhaar_card', 'bank_passbook', 'offer_letter', 'photo'
    ];

    const CONDITIONAL_DOCUMENT_TYPES = [
        'relieving_letter', 'previous_payslips', 'form16'
    ];

    protected $guarded = [];

    protected $casts = [
        'bank_account_number' => 'encrypted',
        'pan_number' => 'encrypted',
        'aadhaar_number' => 'encrypted',
    ];

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
        return $this->documents->whereIn('document_type', $this->required_document_types)
                               ->where('status', 'verified')
                               ->count();
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
        return round(min((float)$this->basic_pay, \App\Services\SalaryCalculationService::PF_WAGE_CEILING) * 0.12, 2);
    }

    public function getEmployeeEsiMonthlyAttribute()
    {
        if (!$this->esi_applicable) return 0.00;
        $gross = (float)$this->gross_monthly_salary;
        $esiLimit = \App\Services\SalaryCalculationService::ESI_WAGE_CEILING;
        return $gross <= $esiLimit ? round($gross * 0.0075, 2) : 0.00;
    }
}
