<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchSynthesisTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = clone User::factory()->create(['role' => 'admin']);
    }

    public function test_single_location_client_auto_generates_head_office_branch()
    {
        $payload = [
            'locationsCount' => 1,
            'name' => 'Single Loc Co',
            'code' => 'SL001',
            'type' => 'pvt_ltd',
            'pan' => 'ABCDE1234F',
            'gstin' => '27ABCDE1234F1Z5',
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
            // 'branches' array explicitly missing or empty
        ];

        $response = $this->actingAs($this->admin)
                         ->postJson('/clients', $payload);

        $response->assertStatus(302); // redirect after success

        $client = Client::where('client_code', 'SL001')->firstOrFail();

        
        $branches = $client->branches;
        $this->assertCount(1, $branches, "Exactly one branch should be synthesized.");
        
        $branch = $branches->first();
        $this->assertEquals('Head Office', $branch->branch_name);
        $this->assertEquals('123 Main St', $branch->address_line_1);
        $this->assertEquals('Mumbai', $branch->city);
        $this->assertEquals('Maharashtra', $branch->state);
        $this->assertEquals('400001', $branch->pin_code);
        $this->assertEquals('27ABCDE1234F1Z5', $branch->gstin);
        $this->assertEquals('Test POC', $branch->finance_poc_name);
        $this->assertEquals(1, $branch->is_primary_billing_branch);
        $this->assertEquals(1, $branch->is_head_office);
    }

    public function test_synthesized_branch_is_preserved_when_client_upgrades_to_multi_location()
    {
        // 1. Create client initially with 1 location (triggers synthesis)
        $initialPayload = [
            'name' => 'Multi Upgrader',
            'code' => 'UPG01',
            'type' => 'pvt_ltd',
            'pan' => 'ABCDE1234F',
            'gstin' => '27ABCDE1234F1Z5',
            'regAddressLine1' => 'Old Address',
            'regCity' => 'Pune',
            'regState' => 'Maharashtra',
            'regPin' => '411001',
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
        ];

        $this->actingAs($this->admin)->postJson('/clients', $initialPayload)->assertStatus(302);
        
        $client = Client::with(['branches', 'contacts'])->where('client_code', 'UPG01')->firstOrFail();
        $this->assertCount(1, $client->branches);
        $synthesizedBranchId = $client->branches->first()->id;
        $primaryContactId = $client->contacts->first()->id;

        // 2. Upgrade to 2 locations and submit with the synthesized branch (unchanged) + 1 new branch
        $updatePayload = array_merge($initialPayload, [
            'locationsCount' => 2,
            'regAddressLine1' => 'New Changed Address', // Changed to test static nature
            'poc1' => [
                'id' => $primaryContactId,
                'name' => 'Test POC',
                'email' => 'poc@example.com',
                'phone' => '9999999999',
            ],
            'branches' => [
                [
                    'id' => (string)$synthesizedBranchId,
                    'name' => 'Head Office',
                    'addr1' => 'Old Address', // It should stay 'Old Address' because it's static
                    'city' => 'Pune',
                    'state' => 'Maharashtra',
                    'pin' => '411001',
                    'gstin' => '27ABCDE1234F1Z5',
                    'isPrimary' => true,
                    'is_head_office' => true,
                    'pocName' => 'Test POC',
                    'pocEmail' => 'poc@example.com',
                    'pocPhone' => '9999999999',
                ],
                [
                    'id' => null, // New branch
                    'name' => 'Bangalore Branch',
                    'addr1' => 'New Blr Address',
                    'city' => 'Bangalore',
                    'state' => 'Karnataka',
                    'pin' => '560001',
                    'gstin' => '29ABCDE1234F1Z5',
                    'isPrimary' => false,
                    'is_head_office' => false,
                    'pocName' => 'Blr POC',
                    'pocEmail' => 'blr@example.com',
                    'pocPhone' => '8888888888',
                ]
            ]
        ]);

        $response = $this->actingAs($this->admin)
                         ->putJson("/clients/{$client->id}", $updatePayload);
                         
        $response->assertStatus(302);

        $client->refresh();
        $this->assertCount(2, $client->branches, "Should now have exactly 2 branches without duplicating the synthesized one.");

        $branches = $client->branches->keyBy('id');
        $this->assertTrue($branches->has($synthesizedBranchId), "The original synthesized branch ID must be preserved.");
        
        $originalBranch = $branches->get($synthesizedBranchId);
        $this->assertEquals('Old Address', $originalBranch->address_line_1, "The synthesized branch address should remain static and not auto-sync with the updated registered address.");
        $this->assertEquals('Head Office', $originalBranch->branch_name);

        $newBranch = $client->branches->where('branch_name', 'Bangalore Branch')->first();
        $this->assertNotNull($newBranch);
        $this->assertEquals('New Blr Address', $newBranch->address_line_1);
    }
}
