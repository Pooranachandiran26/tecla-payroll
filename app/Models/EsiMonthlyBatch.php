<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BlameableTrait;

class EsiMonthlyBatch extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;

    protected $table = 'esi_monthly_batches';

    protected $guarded = [];

    protected $casts = [
        'wage_month' => 'date',
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
        'total_wages' => 'decimal:2',
        'employee_count' => 'integer',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
