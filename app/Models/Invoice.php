<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $appends = ['late_penalty_amount'];

    protected $casts = [
        'first_sent_at' => 'datetime',
        'sent_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function sentBy()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function payer()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

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

    public function additionalFees()
    {
        return $this->hasMany(InvoiceAdditionalFee::class);
    }

    /**
     * Recalculates stored total tax breakdown and grand total using state-wise gst_type branching.
     */
    public function recalculateTotals(): void
    {
        $passthrough = (float) $this->gross_salary_passthrough;
        $agencyFee = (float) $this->agency_service_fee;
        $additionalFeesTotal = (float) $this->additionalFees()->sum('amount');
        
        $taxableServiceFees = round($agencyFee + $additionalFeesTotal, 2);

        if ($this->gst_type === 'cgst_sgst') {
            // Intrastate: 9% CGST + 9% SGST
            $cgst = round($taxableServiceFees * 0.09, 2);
            $sgst = round($taxableServiceFees * 0.09, 2);
            $igst = 0.00;
            $gstAmount = round($cgst + $sgst, 2);
        } else {
            // Interstate: 18% IGST
            $cgst = 0.00;
            $sgst = 0.00;
            $igst = round($taxableServiceFees * 0.18, 2);
            $gstAmount = $igst;
        }

        $grandTotal = round($passthrough + $taxableServiceFees + $gstAmount, 2);

        $this->update([
            'cgst_amount' => $cgst,
            'sgst_amount' => $sgst,
            'igst_amount' => $igst,
            'gst_amount'  => $gstAmount,
            'grand_total' => $grandTotal,
        ]);
    }
}
