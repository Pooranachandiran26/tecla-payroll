<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasIndustry extends Model
{
    protected $table = 'mas_industries';

    protected $fillable = [
        'name',
        'slug',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
