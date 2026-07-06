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
}
