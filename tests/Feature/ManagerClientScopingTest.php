<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;

class ManagerClientScopingTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_client_scoping()
    {
        // 1. Create 3 active clients and branches
        $client1 = Client::factory()->create(['company_name' => 'Client One Alpha', 'status' => 'active']);
        $branch1 = ClientBranch::factory()->create(['client_id' => $client1->id]);

        $client2 = Client::factory()->create(['company_name' => 'Client Two Beta', 'status' => 'active']);
        $branch2 = ClientBranch::factory()->create(['client_id' => $client2->id]);

        $client3 = Client::factory()->create(['company_name' => 'Client Three Gamma', 'status' => 'active']);
        $branch3 = ClientBranch::factory()->create(['client_id' => $client3->id]);

        // 2. Create employees with unique PAN/Aadhaar/Bank numbers
        $emp1 = Employee::factory()->create([
            'client_id' => $client1->id, 
            'branch_id' => $branch1->id, 
            'full_name' => 'Employee Alpha Staff',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '111122223331',
            'bank_account_number' => '100000000001'
        ]);

        $emp2 = Employee::factory()->create([
            'client_id' => $client2->id, 
            'branch_id' => $branch2->id, 
            'full_name' => 'Employee Beta Staff',
            'pan_number' => 'ABCDE2222B',
            'aadhaar_number' => '111122223332',
            'bank_account_number' => '100000000002'
        ]);

        $emp3 = Employee::factory()->create([
            'client_id' => $client3->id, 
            'branch_id' => $branch3->id, 
            'full_name' => 'Employee Gamma Staff',
            'pan_number' => 'ABCDE3333C',
            'aadhaar_number' => '111122223333',
            'bank_account_number' => '100000000003'
        ]);

        // 3. Create Manager user assigned to ONLY client1 and client2
        $manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->managedClients()->attach([$client1->id, $client2->id]);

        // Verify getManagedClientIds
        $managedIds = $manager->getManagedClientIds();
        $this->assertCount(2, $managedIds);
        $this->assertContains($client1->id, $managedIds);
        $this->assertContains($client2->id, $managedIds);
        $this->assertNotContains($client3->id, $managedIds);

        // 4. Test Executive Dashboard Scoping as Manager
        $response = $this->actingAs($manager)->get('/dashboard');
        $response->assertStatus(200);

        $props = $response->inertiaProps();
        $allClientsList = collect($props['allClientsList'])->pluck('id')->toArray();
        
        $this->assertContains($client1->id, $allClientsList);
        $this->assertContains($client2->id, $allClientsList);
        $this->assertNotContains($client3->id, $allClientsList);

        // 5. Test Employee List Scoping as Manager
        $empResponse = $this->actingAs($manager)->get('/employees');
        $empResponse->assertStatus(200);
        
        // 6. Test Client List Scoping as Manager
        $clientResponse = $this->actingAs($manager)->get('/clients');
        $clientResponse->assertStatus(200);
    }
}
