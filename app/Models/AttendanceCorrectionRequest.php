<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AttendanceCorrectionRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'attendance_date',
        'original_punch_in_time',
        'original_punch_out_time',
        'original_status',
        'requested_punch_in_time',
        'requested_punch_out_time',
        'reason_category',
        'reason_details',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'original_punch_in_time' => 'datetime',
        'original_punch_out_time' => 'datetime',
        'requested_punch_in_time' => 'datetime',
        'requested_punch_out_time' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
