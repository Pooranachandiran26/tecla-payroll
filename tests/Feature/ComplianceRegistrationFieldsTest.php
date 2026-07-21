<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Services\SettingsService;
use App\Models\Setting;

class ComplianceRegistrationFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_controller_stores_pf_and_esi_codes()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        
        fwrite(STDERR, "\n--- BEFORE UPDATE ---\n");
        fwrite(STDERR, json_encode(Setting::where('group', 'company_profile')->get()->toArray(), JSON_PRETTY_PRINT) . "\n");

        $response = $this->actingAs($admin)->putJson(route('admin.settings.company.update'), [
            'pf_establishment_code' => 'TECLA-PF-123',
            'esi_code_number' => 'TECLA-ESI-456'
        ]);

        $response->assertStatus(200);

        $this->assertEquals('TECLA-PF-123', SettingsService::get('company_profile.pf_establishment_code'));
        $this->assertEquals('TECLA-ESI-456', SettingsService::get('company_profile.esi_code_number'));
        
        fwrite(STDERR, "\n--- AFTER FIRST UPDATE (TECLA-PF-123 / TECLA-ESI-456) ---\n");
        fwrite(STDERR, json_encode(Setting::where('group', 'company_profile')->whereIn('key', ['pf_establishment_code', 'esi_code_number'])->get()->toArray(), JSON_PRETTY_PRINT) . "\n");

        // Save again to prove no duplicate inserts
        $response2 = $this->actingAs($admin)->putJson(route('admin.settings.company.update'), [
            'pf_establishment_code' => 'TECLA-PF-999',
            'esi_code_number' => 'TECLA-ESI-999'
        ]);
        
        $response2->assertStatus(200);
        $this->assertEquals('TECLA-PF-999', SettingsService::get('company_profile.pf_establishment_code'));
        
        fwrite(STDERR, "\n--- AFTER SECOND UPDATE (TECLA-PF-999 / TECLA-ESI-999) ---\n");
        fwrite(STDERR, json_encode(Setting::where('group', 'company_profile')->whereIn('key', ['pf_establishment_code', 'esi_code_number'])->get()->toArray(), JSON_PRETTY_PRINT) . "\n");

        $count = \App\Models\Setting::where('group', 'company_profile')
            ->where('key', 'pf_establishment_code')
            ->count();
        $this->assertEquals(1, $count, "Duplicate settings row created!");
    }

    public function test_client_controller_stores_pf_and_esi_codes()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        
        $clientData = [
            'name' => 'Test Client',
            'type' => 'pvt_ltd',
            'code' => 'TST-001',
            'status' => 'active',
            'locationsCount' => 1,
            
            'regAddressLine1' => '123 Main St',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            
            'contractType' => 'eor',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2026-01-01',
            
            'pfEstablishmentCode' => 'MH/BAN/12345/000',
            'esiCodeNumber' => '31001234560001001',

            'poc1' => [
                'name' => 'John Doe',
                'email' => 'john@test.com',
                'phone' => '9876543210',
                'contact_type' => 'primary'
            ]
        ];

        $response = $this->actingAs($admin)->postJson(route('clients.store'), $clientData);
        
        if ($response->status() !== 201 && $response->status() !== 200 && $response->status() !== 302) {
            $response->dump();
        }
        
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));
        
        $client = Client::where('client_code', 'TST-001')->first();
        $this->assertNotNull($client);
        $this->assertEquals('MH/BAN/12345/000', $client->pf_establishment_code);
        $this->assertEquals('31001234560001001', $client->esi_code_number);
    }

    public function test_existing_client_updates_successfully_with_null_codes()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        
        // Create an existing client with NULL codes (simulating old data)
        $client = Client::factory()->create([
            'pf_establishment_code' => null,
            'esi_code_number' => null,
        ]);

        $updateData = [
            'name' => 'Legacy Client Updated',
            'code' => $client->client_code,
            'type' => 'pvt_ltd',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Old St',
            'regCity' => 'Pune',
            'regState' => 'Maharashtra',
            'regPin' => '411001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2025-01-01',
            'poc1' => [
                'name' => 'Jane Doe',
                'email' => 'jane@test.com',
                'phone' => '9876543211',
                'contact_type' => 'primary'
            ],
            // Omitting pfEstablishmentCode and esiCodeNumber (simulating form without these)
        ];

        $response = $this->actingAs($admin)->putJson(route('clients.update', $client->id), $updateData);
        if (!in_array($response->status(), [200, 201, 302])) {
            $response->dump();
        }
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));

        $client->refresh();
        $this->assertEquals('Legacy Client Updated', $client->company_name);
        $this->assertNull($client->pf_establishment_code);
    }
}
