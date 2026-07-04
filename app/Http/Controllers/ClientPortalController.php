<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Inertia\Inertia;

class ClientPortalController extends Controller
{
    public function show()
    {
        $client = auth()->user()->client;
        
        // Strip sensitive agency fields (markup_percentage, fixed_fee_amount, etc)
        $safeClientData = $client->only([
            'id', 'company_name', 'client_code', 'industry', 'contract_type', 'status',
            'primary_poc_name', 'primary_poc_email', 'primary_poc_phone',
            'company_type', 'country', 'registered_city', 'registered_state',
            'contract_start_date', 'contract_end_date'
        ]);

        return Inertia::render('ClientPortal/ClientProfile', [
            'client' => $safeClientData
        ]);
    }
}
