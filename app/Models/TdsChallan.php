<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BlameableTrait;

class TdsChallan extends Model
{
    use HasFactory, BlameableTrait;

    protected $table = 'tds_challans';
    protected $guarded = [];

    protected $casts = [
        'deposit_date' => 'date',
        'tax_amount' => 'float',
        'surcharge' => 'float',
        'cess' => 'float',
        'interest' => 'float',
        'fee_234e' => 'float',
        'total_deposited' => 'float',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function batch()
    {
        return $this->belongsTo(Tds24qBatch::class, 'tds_24q_batch_id');
    }
}
