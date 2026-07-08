<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Employee extends Model
{
    use HasFactory;

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
}
