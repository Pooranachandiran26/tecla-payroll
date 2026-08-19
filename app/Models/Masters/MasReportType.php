<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasReportType extends Model
{
    protected $table = 'mas_report_types';

    protected $fillable = [
        'name',
        'category',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
