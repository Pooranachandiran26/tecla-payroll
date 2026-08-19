<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasLeaveType extends Model
{
    protected $table = 'mas_leave_types';

    protected $fillable = [
        'name',
        'code',
        'is_paid',
        'default_accrual',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'default_accrual' => 'float',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
