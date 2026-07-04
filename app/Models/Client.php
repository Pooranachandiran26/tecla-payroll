<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $casts = [
        'pan_number' => 'encrypted',
        'gstin' => 'encrypted',
    ];
}
