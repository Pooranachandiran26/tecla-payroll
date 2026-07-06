<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountManagerTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_manager_can_be_assigned_and_filtered()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $manager = clone User::factory()->create(['name' => 'Real Tecla Manager', 'role' => 'manager']);

        // 1. Assign Real Manager via Client Creation
        $payload = [
            'name' => 'AM Test Client',
            'code' => 'AMTEST',
            'type' => 'pvt_ltd',
            'pan' => 'ABCDE1234F',
            'regAddressLine1' => '123 Main St',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2024-01-01',
            'locationsCount' => 1,
            'poc1' => [
                'name' => 'Test POC',
                'email' => 'poc@example.com',
                'phone' => '9999999999',
            ],
            'accountManager' => $manager->id, // Passing real manager ID
            'branches' => [
                [
                    'name' => 'Head Office',
                    'isPrimary' => true,
                ]
            ]
        ];

        // Ensure StoreClientRequest actually handles our new _id fields
        $response = $this->actingAs($admin)->postJson('/clients', $payload);
        $response->assertStatus(302);

        // Verify it saved to database
        $client = Client::where('client_code', 'AMTEST')->first();
        $this->assertNotNull($client);
        $this->assertEquals($manager->id, $client->account_manager_id);

        // 2. Filter ClientsList by the new Account Manager's Name
        // The list filters by 'am' string matching the AccountManager's name
        $filterResponse = $this->actingAs($admin)->get('/clients?am=Real%20Tecla');
        
        $filterResponse->assertStatus(200);
        $filterResponse->assertSee('AM Test Client');
        
        // Also ensure another filter doesn't return it
        $emptyFilterResponse = $this->actingAs($admin)->get('/clients?am=Nobody');
        $emptyFilterResponse->assertStatus(200);
        $emptyFilterResponse->assertDontSee('AM Test Client');
    }

    public function test_create_page_receives_account_manager_options()
    {
        $admin = User::factory()->create(['name' => 'Rajesh Admin', 'role' => 'admin', 'status' => 'active']);
        $manager = clone User::factory()->create(['name' => 'Sunita Manager', 'role' => 'manager', 'status' => 'active']);
        
        // This suspended user should NOT appear
        User::factory()->create(['name' => 'Suspended Manager', 'role' => 'manager', 'status' => 'suspended']);

        $response = $this->actingAs($admin)->get('/clients/create');
        $response->assertStatus(200);

        // We use Inertia Testing assertions or we can just assert the response content sees the props
        $response->assertSee('Rajesh Admin');
        $response->assertSee('Sunita Manager');
        $response->assertDontSee('Suspended Manager');
    }
}
