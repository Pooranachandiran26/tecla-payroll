<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientMultiBranchRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create and authenticate an admin user for authorization checks
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->actingAs($admin);
    }

    /** @test */
    public function creating_client_with_multiple_branches_persists_all_branches()
    {
        $payload = [
            'name' => 'Apex Logistics Private Limited',
            'type' => 'pvt_ltd',
            'code' => 'APX-REG-01',
            'status' => 'active',
            'country' => 'India',
            'regAddressLine1' => '100 Express Highway',
            'regCity' => 'Chennai',
            'regState' => 'Tamil Nadu',
            'regPin' => '600001',
            'pan' => 'ABCDE1234F',
            'gstin' => '33ABCDE1234F1Z5',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => now()->toDateString(),
            'locationsCount' => 2,
            'poc1' => [
                'name' => 'Rajesh Kumar',
                'email' => 'rajesh@apexlogistics.com',
                'phone' => '9876543210',
            ],
            'branches' => [
                [
                    'id' => null,
                    'code' => 'APX-CHE',
                    'name' => 'Chennai Head Office',
                    'addr1' => '100 Express Highway',
                    'city' => 'Chennai',
                    'state' => 'Tamil Nadu',
                    'pin' => '600001',
                    'gstin' => '33ABCDE1234F1Z5',
                    'gstType' => 'Regular',
                    'pocName' => 'Rajesh Kumar',
                    'pocEmail' => 'rajesh@apexlogistics.com',
                    'pocPhone' => '9876543210',
                    'isPrimary' => true,
                ],
                [
                    'id' => null,
                    'code' => 'APX-MUM',
                    'name' => 'Mumbai Branch Office',
                    'addr1' => 'Plot 45, MIDC Industrial Area',
                    'city' => 'Mumbai',
                    'state' => 'Maharashtra',
                    'pin' => '400093',
                    'gstin' => '27ABCDE1234F1Z1',
                    'gstType' => 'Regular',
                    'pocName' => 'Suresh Patel',
                    'pocEmail' => 'suresh@apexlogistics.com',
                    'pocPhone' => '9876543211',
                    'isPrimary' => false,
                ]
            ]
        ];

        $response = $this->post(route('clients.store'), $payload);
        $response->assertRedirect(route('clients.index'));

        $client = Client::where('client_code', 'APX-REG-01')->firstOrFail();
        
        $this->assertEquals(2, $client->branches()->count());
        $this->assertDatabaseHas('client_branches', [
            'client_id' => $client->id,
            'branch_code' => 'APX-CHE',
            'branch_name' => 'Chennai Head Office',
            'is_primary_billing_branch' => 1,
            'is_head_office' => 1,
        ]);
        $this->assertDatabaseHas('client_branches', [
            'client_id' => $client->id,
            'branch_code' => 'APX-MUM',
            'branch_name' => 'Mumbai Branch Office',
            'is_primary_billing_branch' => 0,
            'is_head_office' => 0,
        ]);
    }

    /** @test */
    public function updating_client_with_multiple_branches_persists_and_updates_all_branches()
    {
        // 1. Create client with 1 default branch
        $client = Client::create([
            'company_name' => 'Tech Solutions Ltd',
            'company_type' => 'pvt_ltd',
            'client_code' => 'TSL-001',
            'status' => 'active',
            'registered_address_line_1' => 'Tech Park',
            'registered_city' => 'Bengaluru',
            'registered_state' => 'Karnataka',
            'registered_pin' => '560001',
            'pan_number' => 'ABCDE5678F',
            'contract_type' => 'agency',
            'billing_model' => 'markup',
            'contract_start_date' => now()->toDateString(),
            'primary_poc_name' => 'Anil Sharma',
            'primary_poc_email' => 'anil@techsolutions.com',
            'primary_poc_phone' => '9876543212',
        ]);

        $primaryBranch = $client->branches()->create([
            'branch_name' => 'Bengaluru Head Office',
            'branch_code' => 'TSL-BLR',
            'address_line_1' => 'Tech Park',
            'city' => 'Bengaluru',
            'state' => 'Karnataka',
            'pin_code' => '560001',
            'is_head_office' => true,
            'is_primary_billing_branch' => true,
        ]);

        $this->assertEquals(1, $client->branches()->count());

        // 2. Perform update adding a 2nd branch (reproducing original bug scenario)
        $updatePayload = [
            'name' => 'Tech Solutions Ltd',
            'type' => 'pvt_ltd',
            'code' => 'TSL-001',
            'status' => 'active',
            'country' => 'India',
            'regAddressLine1' => 'Tech Park',
            'regCity' => 'Bengaluru',
            'regState' => 'Karnataka',
            'regPin' => '560001',
            'pan' => 'ABCDE5678F',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => now()->toDateString(),
            'locationsCount' => 2,
            'poc1' => [
                'name' => 'Anil Sharma',
                'email' => 'anil@techsolutions.com',
                'phone' => '9876543212',
            ],
            'branches' => [
                [
                    'id' => $primaryBranch->id,
                    'code' => 'TSL-BLR',
                    'name' => 'Bengaluru Head Office',
                    'addr1' => 'Tech Park',
                    'city' => 'Bengaluru',
                    'state' => 'Karnataka',
                    'pin' => '560001',
                    'isPrimary' => true,
                ],
                [
                    'id' => null, // New branch
                    'code' => 'TSL-HYD',
                    'name' => 'Hyderabad Hub',
                    'addr1' => 'HITEC City',
                    'city' => 'Hyderabad',
                    'state' => 'Telangana',
                    'pin' => '500081',
                    'isPrimary' => false,
                ]
            ]
        ];

        $response = $this->put(route('clients.update', $client->id), $updatePayload);
        $response->assertRedirect(route('clients.index'));

        // 3. Reload client from fresh DB connection and verify 2 branches exist
        $client->refresh();
        $this->assertEquals(2, $client->branches()->count());

        $branchNames = $client->branches->pluck('branch_name')->toArray();
        $this->assertContains('Bengaluru Head Office', $branchNames);
        $this->assertContains('Hyderabad Hub', $branchNames);

        // 4. Verify statutoryDefaults API endpoint returns BOTH branches for Employee Form dropdown
        $controller = app(\App\Http\Controllers\ClientController::class);
        $defaultsResponse = $controller->statutoryDefaults($client);
        $branchesData = $defaultsResponse->getData(true)['branches'];

        $this->assertCount(2, $branchesData);
        $this->assertEquals('Bengaluru Head Office', $branchesData[0]['name']);
        $this->assertEquals('Hyderabad Hub', $branchesData[1]['name']);
    }

    /** @test */
    public function saving_1_location_client_persists_exactly_1_primary_branch_and_statutory_codes()
    {
        $payload = [
            'name' => 'Single Location Enterprises Ltd',
            'type' => 'pvt_ltd',
            'code' => 'SLE-001',
            'status' => 'active',
            'country' => 'India',
            'regAddressLine1' => '50 MG Road',
            'regCity' => 'Bengaluru',
            'regState' => 'Karnataka',
            'regPin' => '560001',
            'pan' => 'ABCDE9999F',
            'gstin' => '29ABCDE9999F1Z2',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 12,
            'contractStart' => now()->toDateString(),
            'locationsCount' => 1,
            'pfEstablishmentCode' => 'KN/BAN/0012345/000',
            'esiCodeNumber' => '31000999990001001',
            'poc1' => [
                'name' => 'Vikram Seth',
                'email' => 'vikram@singlelocation.com',
                'phone' => '9876543299',
            ],
            'branches' => [
                [
                    'id' => null,
                    'code' => 'SLE-HO',
                    'name' => 'Head Office',
                    'addr1' => '50 MG Road',
                    'city' => 'Bengaluru',
                    'state' => 'Karnataka',
                    'pin' => '560001',
                    'gstin' => '29ABCDE9999F1Z2',
                    'isPrimary' => true,
                ]
            ]
        ];

        $response = $this->post(route('clients.store'), $payload);
        $response->assertRedirect(route('clients.index'));

        $client = Client::where('client_code', 'SLE-001')->firstOrFail();

        // 1. Verify PF Establishment Code and ESI Code Number saved in DB
        $this->assertEquals('KN/BAN/0012345/000', $client->pf_establishment_code);
        $this->assertEquals('31000999990001001', $client->esi_code_number);

        // 2. Verify EXACTLY 1 branch persisted in database (not 0, not deleted)
        $this->assertEquals(1, $client->branches()->count());

        $branch = $client->branches()->first();
        $this->assertEquals('Head Office', $branch->branch_name);
        $this->assertEquals('50 MG Road', $branch->address_line_1);
        $this->assertEquals('Bengaluru', $branch->city);
        $this->assertEquals('Karnataka', $branch->state);
        $this->assertEquals('560001', $branch->pin_code);
        $this->assertEquals(1, $branch->is_primary_billing_branch);
        $this->assertEquals(1, $branch->is_head_office);
    }
}
