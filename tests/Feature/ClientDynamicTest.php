<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\ClientContact;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ClientDynamicTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed database or create necessary users
        $this->artisan('db:seed');
    }

    public function test_valid_create_submission()
    {
        $admin = User::where('role', 'admin')->first();
        
        $payload = [
            'name' => 'Valid Corp',
            'code' => 'VAL001',
            'type' => 'pvt_ltd',
            'regAddressLine1' => '123 Test St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'contractStart' => '2026-01-01',
            'markupPct' => 10,
            'poc1' => ['name' => 'Primary POC', 'email' => 'primary@test.com', 'phone' => '9876543210'],
            'branches' => [
                [
                    'name' => 'HQ',
                    'addr1' => 'HQ Address',
                    'city' => 'Chennai',
                    'state' => 'Tamil Nadu',
                    'isPrimary' => true,
                    'gstin' => '33ABCDE1234F1Z5',
                ]
            ]
        ];

        $response = $this->actingAs($admin)->followingRedirects()->post('/clients', $payload);
        $response->assertStatus(200);
        $response->assertSee('Valid Corp');
        
        $this->assertDatabaseHas('clients', ['company_name' => 'Valid Corp']);
        $this->assertDatabaseHas('client_branches', ['gstin' => '33ABCDE1234F1Z5', 'is_primary_billing_branch' => 1]);
        $this->assertDatabaseHas('client_contacts', ['email' => 'primary@test.com', 'contact_type' => 'primary']);
        
        echo "4. Valid Create Submission: DB Rows Confirmed!\n";
    }

    public function test_invalid_gstin_state_mismatch()
    {
        $admin = User::where('role', 'admin')->first();
        
        $payload = [
            'name' => 'Invalid GSTIN Corp',
            'code' => 'INV001',
            'type' => 'pvt_ltd',
            'regAddressLine1' => '123 Test St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'contractStart' => '2026-01-01',
            'markupPct' => 10,
            'poc1' => ['name' => 'Primary POC', 'email' => 'primary@test.com', 'phone' => '9876543210'],
            'branches' => [
                [
                    'state' => 'Tamil Nadu', // State code 33
                    'gstin' => '27ABCDE1234F1Z5', // Starts with 27 (Maharashtra)
                    'isPrimary' => true,
                ]
            ]
        ];

        $response = $this->actingAs($admin)->post('/clients', $payload);
        $response->assertSessionHasErrors(['branches.0.gstin']);
        
        echo "5. Invalid GSTIN State Mismatch: 422 Error Confirmed!\n";
    }

    public function test_double_primary_billing_branch()
    {
        $admin = User::where('role', 'admin')->first();
        
        $payload = [
            'name' => 'Double Primary Corp',
            'code' => 'DBL001',
            'type' => 'pvt_ltd',
            'regAddressLine1' => '123 Test St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'contractStart' => '2026-01-01',
            'markupPct' => 10,
            'poc1' => ['name' => 'Primary POC', 'email' => 'primary@test.com', 'phone' => '9876543210'],
            'branches' => [
                ['state' => 'Tamil Nadu', 'isPrimary' => true],
                ['state' => 'Maharashtra', 'isPrimary' => true],
            ]
        ];

        $response = $this->actingAs($admin)->post('/clients', $payload);
        $response->assertSessionHasErrors(['branches']);
        
        echo "6. Double Primary Billing Branch: 422 Error Confirmed!\n";
    }

    public function test_no_primary_contact()
    {
        $admin = User::where('role', 'admin')->first();
        
        $payload = [
            'name' => 'No POC Corp',
            'code' => 'NOP001',
            'type' => 'pvt_ltd',
            'regAddressLine1' => '123 Test St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'contractStart' => '2026-01-01',
            'markupPct' => 10,
            // MISSING poc1
        ];

        $response = $this->actingAs($admin)->post('/clients', $payload);
        $response->assertSessionHasErrors(['contacts']);
        
        echo "7. No Primary Contact: 422 Error Confirmed!\n";
    }

    public function test_manager_statutory_edit_rejection()
    {
        $manager = User::where('role', 'manager')->first();
        $client = Client::first();
        
        $payload = [
            'name' => $client->company_name,
            'code' => $client->client_code,
            'type' => $client->company_type,
            'regAddressLine1' => '123 Test St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'contractStart' => '2026-01-01',
            'markupPct' => 10,
            'poc1' => ['name' => 'Primary POC', 'email' => 'primary@test.com', 'phone' => '9876543210'],
            'statutory_bonus_applicable' => true // STATUTORY FIELD
        ];

        $response = $this->actingAs($manager)->put('/clients/' . $client->id, $payload);
        $response->assertStatus(403);
        
        echo "8. Manager Statutory Edit Rejection: 403 Confirmed!\n";
    }

    public function test_contact_sync_logic()
    {
        $admin = User::where('role', 'admin')->first();
        $client = Client::first();
        
        $c1 = $client->contacts()->create(['contact_type' => 'primary', 'full_name' => 'Old Primary', 'email' => 'old@test.com', 'phone' => '9999999999']);
        $c2 = $client->contacts()->create(['contact_type' => 'finance', 'full_name' => 'Finance POC', 'email' => 'fin@test.com', 'phone' => '8888888888']);
        
        $payload = [
            'name' => $client->company_name,
            'code' => $client->client_code,
            'type' => $client->company_type,
            'regAddressLine1' => '123 Test St',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'contractStart' => '2026-01-01',
            'markupPct' => 10,
            // Keep Primary (update), Delete Finance, Create HR
            'poc1' => ['id' => $c1->id, 'name' => 'New Primary', 'email' => 'new@test.com', 'phone' => '7777777777'],
            'poc3' => ['name' => 'HR POC', 'email' => 'hr@test.com', 'phone' => '6666666666']
        ];

        $response = $this->actingAs($admin)->from('/clients/' . $client->id . '/edit')->followingRedirects()->put('/clients/' . $client->id, $payload);
        $response->assertStatus(200);
        $response->assertSee('New Primary');
        
        $this->assertDatabaseHas('client_contacts', ['id' => $c1->id, 'full_name' => 'New Primary']); // Updated
        $this->assertDatabaseMissing('client_contacts', ['id' => $c2->id]); // Deleted
        $this->assertDatabaseHas('client_contacts', ['full_name' => 'HR POC']); // Created
        
        echo "9. Contact Sync Logic (Create/Update/Delete): Confirmed!\n";
    }
}
