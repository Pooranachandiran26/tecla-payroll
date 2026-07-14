<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function branch()
    {
        return $this->belongsTo(ClientBranch::class, 'branch_id');
    }

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function lineItems()
    {
        return $this->hasMany(InvoiceLineItem::class);
    }
}
