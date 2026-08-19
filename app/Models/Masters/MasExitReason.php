<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasExitReason extends Model
{
    protected $table = 'mas_exit_reasons';

    protected $fillable = [
        'name',
        'exit_type_category',
        'triggers_forfeiture_review',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'triggers_forfeiture_review' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
