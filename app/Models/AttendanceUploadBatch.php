<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceUploadBatch extends Model
{
    use HasFactory;

    protected $table = 'attendance_upload_batches';

    protected $fillable = [
        'client_id',
        'target_month',
        'uploaded_file_name',
        'total_rows',
        'matched_rows',
        'status',
        'uploaded_by',
        'created_by',
        'updated_by',
        'verified_by',
    ];

    protected $casts = [
        'target_month' => 'date',
        'total_rows' => 'integer',
        'matched_rows' => 'integer',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function attendanceRecords()
    {
        // Reference by string uploaded_batch_id
        return $this->hasMany(AttendanceRecord::class, 'uploaded_batch_id', 'id');
    }
}
