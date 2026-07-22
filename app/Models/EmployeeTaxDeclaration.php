<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeTaxDeclaration extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'financial_year',
        'regime',
        'ppf_amount',
        'elss_amount',
        'life_insurance_premium',
        'tuition_fees',
        'nsc_amount',
        'housing_loan_principal',
        'other_80c',
        'health_insurance_self',
        'health_insurance_parents',
        'is_parents_senior',
        'home_loan_interest_self',
        'monthly_rent_paid',
        'landlord_name',
        'landlord_pan',
        'landlord_address',
        'is_metro_city',
        'section_80e_education_loan',
        'section_80g_donations',
        'other_exemptions',
        'previous_employer_gross',
        'previous_employer_tds',
        'status',
        'rejection_reason',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'ppf_amount' => 'float',
        'elss_amount' => 'float',
        'life_insurance_premium' => 'float',
        'tuition_fees' => 'float',
        'nsc_amount' => 'float',
        'housing_loan_principal' => 'float',
        'other_80c' => 'float',
        'health_insurance_self' => 'float',
        'health_insurance_parents' => 'float',
        'is_parents_senior' => 'boolean',
        'home_loan_interest_self' => 'float',
        'monthly_rent_paid' => 'float',
        'is_metro_city' => 'boolean',
        'section_80e_education_loan' => 'float',
        'section_80g_donations' => 'float',
        'other_exemptions' => 'float',
        'previous_employer_gross' => 'float',
        'previous_employer_tds' => 'float',
        'verified_at' => 'datetime',
    ];

    /**
     * Relationship: Belongs to an Employee.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Relationship: Belongs to User (verifier).
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Accessor: Total 80C amount capped at ₹1,50,000.
     */
    public function getTotal80cAttribute(): float
    {
        $sum = $this->ppf_amount +
            $this->elss_amount +
            $this->life_insurance_premium +
            $this->tuition_fees +
            $this->nsc_amount +
            $this->housing_loan_principal +
            $this->other_80c;

        return min(150000.00, (float)$sum);
    }

    /**
     * Accessor: Total 80D health insurance amount.
     */
    public function getTotal80dAttribute(): float
    {
        $selfLimit = 25000.00;
        $parentsLimit = $this->is_parents_senior ? 50000.00 : 25000.00;

        $selfDeduction = min($selfLimit, (float)$this->health_insurance_self);
        $parentsDeduction = min($parentsLimit, (float)$this->health_insurance_parents);

        return $selfDeduction + $parentsDeduction;
    }

    /**
     * Accessor: Total 24b Home Loan interest capped at ₹2,00,000.
     */
    public function getTotal24bAttribute(): float
    {
        return min(200000.00, (float)$this->home_loan_interest_self);
    }
}
