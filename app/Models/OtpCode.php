<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    protected $fillable = ['user_id', 'purpose', 'code_hash', 'expires_at', 'consumed_at', 'attempts', 'ip_address'];
    protected $casts = [
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
    ];
    public function user() { return $this->belongsTo(User::class); }
}
