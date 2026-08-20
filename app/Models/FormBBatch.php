<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BlameableTrait;

class FormBBatch extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;

    protected $table = 'form_b_batches';

    protected $guarded = [];

    protected $casts = [
        'payroll_month' => 'date',
        'total_basic_wages' => 'float',
        'total_da' => 'float',
        'total_ot' => 'float',
        'total_bonus' => 'float',
        'total_other_wage_components' => 'float',
        'total_emoluments_payable' => 'float',
        'total_fine' => 'float',
        'total_other_deductions' => 'float',
        'total_deductions' => 'float',
        'amount_actually_paid' => 'float',
        'balance_due' => 'float',
        'ot_data_available' => 'boolean',
        'bonus_data_available' => 'boolean',
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function branch()
    {
        return $this->belongsTo(ClientBranch::class, 'branch_id');
    }

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function generatedBy()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
