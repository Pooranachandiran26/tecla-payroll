<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'group',
        'key',
        'value',
        'type',
        'is_locked',
        'updated_by',
    ];

    protected $casts = [
        'is_locked' => 'boolean',
    ];
}
