<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientLeavePolicy extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'leave_type',
        'policy_name',
        'annual_quota',
        'accrual_frequency',
        'monthly_accrual_rate',
        'max_days_per_month',
        'carry_forward_allowed',
        'max_carry_forward_days',
        'is_active',
    ];

    protected $casts = [
        'annual_quota' => 'float',
        'monthly_accrual_rate' => 'float',
        'max_days_per_month' => 'float',
        'carry_forward_allowed' => 'boolean',
        'max_carry_forward_days' => 'float',
        'is_active' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function employeeLeaveBalances(): HasMany
    {
        return $this->hasMany(EmployeeLeaveBalance::class);
    }
}
