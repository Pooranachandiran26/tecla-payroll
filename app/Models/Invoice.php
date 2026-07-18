<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = ['late_penalty_amount'];

    public function getLatePenaltyAmountAttribute(): float
    {
        if ($this->status === 'paid' || now()->toDateString() <= $this->due_date) {
            return 0.00;
        }

        $client = $this->client;
        if (!$client || !$client->late_payment_penalty_pct) {
            return 0.00;
        }

        $dueDate = \Carbon\Carbon::parse($this->due_date);
        $daysPast = $dueDate->diffInDays(now()->startOfDay());
        $monthlyRate = (float) $client->late_payment_penalty_pct;
        $dailyRate = ($monthlyRate / 30) / 100;

        return round((float) $this->grand_total * $dailyRate * $daysPast, 2);
    }

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
