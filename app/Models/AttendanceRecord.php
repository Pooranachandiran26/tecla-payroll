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
        'latitude',
        'longitude',
        'place_name',
    ];

    protected $casts = [
        'punch_in_time' => 'datetime',
        'punch_out_time' => 'datetime',
        'hours_worked' => 'decimal:2',
    ];

    protected static function booted()
    {
        $invalidateVerification = function ($record) {
            // Retrieve client_id from employee relation
            $employee = $record->employee;
            if ($employee && $employee->client_id) {
                // Determine target month start date (e.g. YYYY-MM-01)
                $monthStart = \Carbon\Carbon::parse($record->attendance_date)->startOfMonth()->toDateString();
                
                // Delete verification record
                \App\Models\ClientAttendanceVerification::where('client_id', $employee->client_id)
                    ->whereDate('target_month', $monthStart)
                    ->delete();
            }
        };

        static::saved($invalidateVerification);
        static::deleted($invalidateVerification);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
