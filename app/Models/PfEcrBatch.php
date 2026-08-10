<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BlameableTrait;

class PfEcrBatch extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;

    protected $table = 'pf_ecr_batches';

    protected $guarded = [];

    protected $casts = [
        'wage_month' => 'date',
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
        'total_epf_wages' => 'decimal:2',
        'total_eps_wages' => 'decimal:2',
        'total_employee_epf' => 'decimal:2',
        'total_employer_epf' => 'decimal:2',
        'total_employer_eps' => 'decimal:2',
        'employee_count' => 'integer',
        'total_ncp_days' => 'integer',
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
