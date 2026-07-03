<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index()
    {
        return Inertia::render('Clients/ClientsList');
    }

    public function create()
    {
        return Inertia::render('Clients/ClientForm');
    }

    public function store(Request $request)
    {
        // To be implemented
    }

    public function show($id)
    {
        return Inertia::render('Clients/ClientDetail');
    }

    public function update(Request $request, $id)
    {
        // To be implemented
    }
}
