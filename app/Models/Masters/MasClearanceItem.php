<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasClearanceItem extends Model
{
    protected $table = 'mas_clearance_items';

    protected $fillable = [
        'name',
        'default_department',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
