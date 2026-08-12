<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BlameableTrait;

class Gstr1Batch extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;

    protected $guarded = [];

    protected $casts = [
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
        'total_taxable_value' => 'float',
        'total_igst' => 'float',
        'total_cgst' => 'float',
        'total_sgst' => 'float',
        'total_tax_liability' => 'float',
    ];

    public function generatedBy()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
