<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasDesignation extends Model
{
    protected $table = 'mas_designations';

    protected $fillable = [
        'name',
        'department_name',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
