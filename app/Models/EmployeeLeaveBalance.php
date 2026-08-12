<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeLeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'client_leave_policy_id',
        'year',
        'allocated_days',
        'carried_over_days',
        'used_days',
        'pending_days',
        'remaining_days',
        'snapshot_max_carry_forward_days',
    ];

    protected $casts = [
        'year' => 'integer',
        'allocated_days' => 'float',
        'carried_over_days' => 'float',
        'used_days' => 'float',
        'pending_days' => 'float',
        'remaining_days' => 'float',
        'snapshot_max_carry_forward_days' => 'float',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(ClientLeavePolicy::class, 'client_leave_policy_id');
    }
}
