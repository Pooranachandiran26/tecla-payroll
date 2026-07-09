<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeExit extends Model
{
    use HasFactory;
    use \Illuminate\Database\Eloquent\SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'submission_date' => 'date',
        'last_working_day' => 'date',
        'discussed_with_employee' => 'boolean',
        'notice_amount' => 'decimal:2',
        'pending_salary_amount' => 'decimal:2',
        'leave_encashment_amount' => 'decimal:2',
        'bonus_amount' => 'decimal:2',
        'gratuity_amount' => 'decimal:2',
        'loan_recovery_amount' => 'decimal:2',
        'tds_amount' => 'decimal:2',
        'net_settlement_amount' => 'decimal:2',
        'adhoc_adjustments' => 'json',
        'confirmed_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
