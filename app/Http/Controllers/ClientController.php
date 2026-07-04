<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;


class ClientController extends Controller
{
    public function index()
    {
        $clients = \App\Models\Client::all();
        return Inertia::render('Clients/ClientsList', [
            'clients' => \App\Http\Resources\ClientResource::collection($clients)
        ]);
    }

    public function create()
    {
        return Inertia::render('Clients/ClientForm');
    }

    public function store(Request $request)
    {
        // Stub for future implementation
        return redirect('/clients');
    }

    public function show(\App\Models\Client $client)
    {
        return Inertia::render('Clients/ClientDetail', [
            'client' => new \App\Http\Resources\ClientResource($client)
        ]);
    }

    public function update(Request $request, $client)
    {
        // First check statutory authorization if statutory fields are present
        if ($request->hasAny(['default_gratuity_mode', 'statutory_bonus_applicable', 'pt_applicable'])) {
            $this->authorize('updateStatutory', $client);
        }

        // Rest of the update logic will go here
        return redirect()->back()->with('success', 'Client updated successfully');
    }
}
