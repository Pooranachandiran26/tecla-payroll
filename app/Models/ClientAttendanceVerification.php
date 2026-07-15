<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientAttendanceVerification extends Model
{
    protected $guarded = [];

    protected $casts = [
        'target_month' => 'date',
        'verified_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
