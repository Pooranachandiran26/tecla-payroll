<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EsiReasonCode extends Model
{
    use HasFactory;

    protected $table = 'esi_reason_codes';

    protected $guarded = [];

    protected $casts = [
        'code' => 'integer',
        'requires_zero_days' => 'boolean',
        'requires_last_working_day' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
