<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PayrollRunItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    public static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $run = $item->payrollRun;
            if ($run && in_array($run->status, ['approved', 'locked'])) {
                throw new \Exception("Cannot modify items of a payroll run that is already approved or locked.");
            }
        });

        static::deleting(function ($item) {
            $run = $item->payrollRun;
            if ($run && in_array($run->status, ['approved', 'locked'])) {
                throw new \Exception("Cannot delete items of a payroll run that is already approved or locked.");
            }
        });
    }

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
