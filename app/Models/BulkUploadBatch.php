<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BulkUploadBatch extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'type',
        'client_id',
        'target_month',
        'file_name',
        'file_path',
        'status',
        'total_rows',
        'processed_rows',
        'valid_count',
        'error_count',
        'warning_count',
        'auto_provision_users',
        'partial_import',
        'summary',
        'error_message',
        'processing_time_ms',
    ];

    protected $casts = [
        'total_rows' => 'integer',
        'processed_rows' => 'integer',
        'valid_count' => 'integer',
        'error_count' => 'integer',
        'warning_count' => 'integer',
        'auto_provision_users' => 'boolean',
        'partial_import' => 'boolean',
        'summary' => 'array',
        'processing_time_ms' => 'integer',
        'target_month' => 'date',
    ];

    protected $appends = ['formatted_duration'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function getFormattedDurationAttribute(): string
    {
        if ($this->processing_time_ms) {
            if ($this->processing_time_ms < 1000) {
                return $this->processing_time_ms . 'ms';
            }
            return round($this->processing_time_ms / 1000, 2) . 's';
        }

        if ($this->created_at && $this->updated_at && $this->status !== 'processing') {
            $diffMs = $this->created_at->diffInMilliseconds($this->updated_at);
            if ($diffMs > 0) {
                return $diffMs < 1000 ? $diffMs . 'ms' : round($diffMs / 1000, 2) . 's';
            }
        }

        return '—';
    }

    public function scopeForUser($query, User $user)
    {
        if ($user->role === 'admin') {
            return $query;
        }

        if ($user->role === 'manager') {
            $managedClientIds = $user->getManagedClientIds();
            if (empty($managedClientIds)) {
                return $query->where('user_id', $user->id);
            }

            $batchIdsWithManagedClients = \Illuminate\Support\Facades\DB::table('bulk_upload_staging_rows')
                ->whereIn('client_id', $managedClientIds)
                ->pluck('batch_id')
                ->filter()
                ->unique()
                ->toArray();

            $attendanceBatchIdsWithManagedClients = \Illuminate\Support\Facades\DB::table('attendance_upload_staging_rows')
                ->whereIn('client_id', $managedClientIds)
                ->pluck('batch_id')
                ->filter()
                ->unique()
                ->toArray();

            return $query->where(function ($q) use ($user, $batchIdsWithManagedClients, $attendanceBatchIdsWithManagedClients, $managedClientIds) {
                $q->where('user_id', $user->id)
                  ->orWhereIn('client_id', $managedClientIds);
                if (!empty($batchIdsWithManagedClients)) {
                    $q->orWhereIn('id', $batchIdsWithManagedClients);
                }
                if (!empty($attendanceBatchIdsWithManagedClients)) {
                    $q->orWhereIn('id', $attendanceBatchIdsWithManagedClients);
                }
            });
        }

        return $query->whereRaw('1 = 0');
    }
}
