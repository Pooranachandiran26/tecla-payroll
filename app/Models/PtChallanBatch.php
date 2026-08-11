<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PtChallanBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'payroll_run_id',
        'wage_month',
        'employee_count',
        'total_pt_amount',
        'status',
        'trrn_number',
        'challan_number',
        'file_path',
        'file_name',
        'file_hash',
        'generated_by',
        'generated_at',
        'downloaded_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
        'total_pt_amount' => 'decimal:2',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
