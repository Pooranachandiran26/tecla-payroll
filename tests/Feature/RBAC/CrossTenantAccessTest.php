<?php

namespace Tests\Feature\RBAC;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;

class CrossTenantAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_cannot_access_other_client_data()
    {
        $this->seed();
        
        $clientUser = User::where('email', 'client@tecla.in')->first();
        $this->actingAs($clientUser);
        
        $otherClient = Client::where('company_name', 'TCS')->first(); // Client 2
        
        $response = $this->get('/clients/' . $otherClient->id);
        
        $response->assertStatus(403);
    }
}
