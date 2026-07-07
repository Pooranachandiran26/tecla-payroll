<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
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
}
