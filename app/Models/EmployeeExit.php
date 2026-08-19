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
        'pt_shortfall_recovery' => 'decimal:2',
        'net_settlement_amount' => 'decimal:2',
        'adhoc_adjustments' => 'json',
        'confirmed_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function exitReason()
    {
        return $this->belongsTo(\App\Models\Masters\MasExitReason::class, 'exit_reason_id');
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
