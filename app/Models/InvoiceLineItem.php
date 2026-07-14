<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class InvoiceLineItem extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
