<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientContact extends Model
{
    use SoftDeletes;
    protected $guarded = [];

    protected $casts = [
        'is_whatsapp_same' => 'boolean',
        'cc_on_invoice' => 'boolean',
        'receive_onboarding_kits' => 'boolean',
        'preference_email' => 'boolean',
        'preference_sms' => 'boolean',
        'preference_whatsapp' => 'boolean',
        'communication_preferences' => 'array',
    ];
}
