<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BlameableTrait;

class Tds24qBatch extends Model
{
    use HasFactory, SoftDeletes, BlameableTrait;

    protected $table = 'tds_24q_batches';
    protected $guarded = [];

    protected $casts = [
        'generated_at' => 'datetime',
        'downloaded_at' => 'datetime',
        'total_taxable_salary' => 'float',
        'total_tds_deducted' => 'float',
        'total_tax_deposited' => 'float',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function challans()
    {
        return $this->hasMany(TdsChallan::class, 'tds_24q_batch_id');
    }

    public function generatedBy()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
