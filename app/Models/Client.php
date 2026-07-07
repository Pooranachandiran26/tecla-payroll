<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;
    protected $guarded = [];

    /**
     * Fields safe to include in watcher notification emails.
     * Encrypted/PII fields (pan_number, gstin, etc.) are deliberately excluded.
     */
    const NOTIFIABLE_FIELDS = [
        'company_name',
        'client_code',
        'industry',
        'contract_type',
        'contract_start_date',
        'contract_end_date',
        'billing_model',
        'status',
        'auto_renewal',
        'notice_period_days',
        'account_manager_id',
        'backup_account_manager_id',
        'payment_net_terms',
        'invoice_cycle',
        'sla_tier',
        'client_portal_enabled',
    ];

    protected $casts = [
        'pan_number' => 'encrypted',
        'gstin' => 'encrypted',
    ];

    public function contacts()
    {
        return $this->hasMany(ClientContact::class);
    }

    public function branches()
    {
        return $this->hasMany(ClientBranch::class);
    }

    public function documents()
    {
        return $this->hasMany(ClientDocument::class);
    }

    public function accountManager()
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function backupAccountManager()
    {
        return $this->belongsTo(User::class, 'backup_account_manager_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
