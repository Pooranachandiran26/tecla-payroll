<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientDocument extends Model
{
    use SoftDeletes;
    protected $guarded = [];

    public const ALLOWED_TYPES = [
        'agent_client_agreement', 
        'msa', 
        'pan_card', 
        'gst_cert', 
        'work_order', 
        'nda', 
        'tan_doc', 
        'other'
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
