<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeLoanRepayment extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'amount_deducted' => 'float',
        'amount_deferred' => 'float',
        'payroll_month' => 'date:Y-m-d',
    ];

    public function loan()
    {
        return $this->belongsTo(EmployeeLoan::class, 'employee_loan_id');
    }

    public function payrollRunItem()
    {
        return $this->belongsTo(PayrollRunItem::class, 'payroll_run_item_id');
    }
}
