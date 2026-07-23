<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'holiday_date' => 'date:Y-m-d',
        'is_optional' => 'boolean',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
