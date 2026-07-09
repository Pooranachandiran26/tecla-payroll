<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'attendance_date',
        'punch_in_time',
        'punch_out_time',
        'hours_worked',
        'status',
        'source',
        'uploaded_batch_id',
        'notes',
    ];

    protected $casts = [
        'punch_in_time' => 'datetime',
        'punch_out_time' => 'datetime',
        'hours_worked' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
