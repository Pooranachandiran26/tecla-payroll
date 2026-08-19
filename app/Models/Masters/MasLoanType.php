<?php

namespace App\Models\Masters;

use Illuminate\Database\Eloquent\Model;

class MasLoanType extends Model
{
    protected $table = 'mas_loan_types';

    protected $fillable = [
        'name',
        'code',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
