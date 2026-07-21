<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplianceFiling extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'statute',
        'period',
        'status',
        'filed_by',
        'filed_at',
        'notes',
    ];

    protected $casts = [
        'filed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function filer()
    {
        return $this->belongsTo(User::class, 'filed_by');
    }
}
