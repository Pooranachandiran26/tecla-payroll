<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SalaryRevision extends Model
{
    use HasFactory;
    use \Illuminate\Database\Eloquent\SoftDeletes;

    protected $guarded = [];

    protected $casts = [
        'effective_date' => 'date',
        'approved_at' => 'datetime',
        'old_basic_pay' => 'decimal:2',
        'old_hra' => 'decimal:2',
        'old_conveyance' => 'decimal:2',
        'old_da' => 'decimal:2',
        'old_medical_allowance' => 'decimal:2',
        'old_special_allowance' => 'decimal:2',
        'old_other_additions' => 'decimal:2',
        'old_net_take_home' => 'decimal:2',
        'old_ctc' => 'decimal:2',
        
        'new_basic_pay' => 'decimal:2',
        'new_hra' => 'decimal:2',
        'new_conveyance' => 'decimal:2',
        'new_da' => 'decimal:2',
        'new_medical_allowance' => 'decimal:2',
        'new_special_allowance' => 'decimal:2',
        'new_other_additions' => 'decimal:2',
        'new_net_take_home' => 'decimal:2',
        'new_ctc' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
