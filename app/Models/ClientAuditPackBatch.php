<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BlameableTrait;

class ClientAuditPackBatch extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;

    protected $table = 'client_audit_pack_batches';

    protected $guarded = [];

    protected $casts = [
        'manifest' => 'array',
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
        'included_count' => 'integer',
        'missing_count' => 'integer',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
