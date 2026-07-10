<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Phase3VerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_devtools_bypass_403()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $manager = User::factory()->create(['role' => 'manager']);

        $client = Client::create([
            'company_name' => 'Original Inc.',
            'client_code' => 'ORIG-01',
            'company_type' => 'pvt_ltd',
            'contract_type' => 'agency',
            'contract_start_date' => '2024-01-01',
            'billing_model' => 'markup',
            'registered_address_line_1' => '123',
            'registered_city' => 'City',
            'registered_state' => 'State',
            'registered_pin' => '400001',
            'primary_poc_name' => 'POC 1',
            'primary_poc_email' => 'poc1@example.com',
            'primary_poc_phone' => '9999999999',
            'pt_state' => 'MH',
        ]);

        $payload = [
            'locationsCount' => 1,
            'name' => 'Bypass Test Inc.',
            'type' => 'pvt_ltd',
            'code' => 'BYPASS-01',
            'regAddressLine1' => '123 Test',
            'regCity' => 'Test',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'taxId' => '1234',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2024-01-01',
            'poc1' => [
                'name' => 'POC 1',
                'email' => 'poc1@example.com',
                'phone' => '9999999999',
            ],
            'ptState' => 'KA', // Attempting to change a statutory field
        ];

        // Manager tries to update statutory field
        $response = $this->actingAs($manager)->putJson("/clients/{$client->id}", $payload);

        // Expect 403 Forbidden because Manager cannot update statutory fields
        $response->assertStatus(403);
        
        echo "\n--- 1. DEVTOOLS BYPASS 403 (MANAGER) ---\n";
        echo "Response Status: " . $response->status() . "\n";
        echo "Response Body: " . json_encode($response->json(), JSON_PRETTY_PRINT) . "\n";
        
        // Admin tries to update statutory field (should succeed validation if other fields valid, 
        // or return 422 for missing fields, but NOT 403)
        $responseAdmin = $this->actingAs($admin)->putJson("/clients/{$client->id}", $payload);
        $this->assertNotEquals(403, $responseAdmin->status());
        
        echo "Response Status (Admin): " . $responseAdmin->status() . "\n";
    }

    public function test_document_flow()
    {
        Storage::fake('local');

        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::create([
            'company_name' => 'Original Inc.',
            'client_code' => 'ORIG-02',
            'company_type' => 'pvt_ltd',
            'contract_type' => 'agency',
            'contract_start_date' => '2024-01-01',
            'billing_model' => 'markup',
            'registered_address_line_1' => '123',
            'registered_city' => 'City',
            'registered_state' => 'State',
            'registered_pin' => '400001',
            'primary_poc_name' => 'POC 2',
            'primary_poc_email' => 'poc2@example.com',
            'primary_poc_phone' => '9999999999',
        ]);

        $file = UploadedFile::fake()->create('test-pan.pdf', 100, 'application/pdf');

        // 1. Upload
        $response = $this->actingAs($admin)->post("/clients/{$client->id}/documents", [
            'type' => 'pan_card',
            'file' => $file,
        ]);

        $response->assertRedirect();
        
        $document = $client->documents()->first();
        $this->assertNotNull($document);
        $this->assertEquals('pan_card', $document->document_type);
        $this->assertEquals('pending', $document->verification_status);

        echo "\n--- 2. DOCUMENT FLOW ---\n";
        echo "Uploaded Document: " . $document->file_name . " | Status: " . $document->verification_status . "\n";

        // 2. Verify
        $verifyResponse = $this->actingAs($admin)->put("/clients/{$client->id}/documents/{$document->id}/verify", [
            'status' => 'verified',
        ]);
        
        $verifyResponse->assertRedirect();
        $document->refresh();
        $this->assertEquals('verified', $document->verification_status);
        echo "Verification Status After Update: " . $document->verification_status . "\n";

        // 3. Download
        $downloadResponse = $this->actingAs($admin)->get("/clients/{$client->id}/documents/{$document->id}/download");
        $downloadResponse->assertStatus(200);
        echo "Download Status: " . $downloadResponse->getStatusCode() . "\n";
    }

    public function test_id_stability_regression()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::create([
            'company_name' => 'Original Inc.',
            'client_code' => 'ORIG-03',
            'company_type' => 'pvt_ltd',
            'contract_type' => 'agency',
            'contract_start_date' => '2024-01-01',
            'billing_model' => 'markup',
            'registered_address_line_1' => '123',
            'registered_city' => 'City',
            'registered_state' => 'State',
            'registered_pin' => '400001',
            'primary_poc_name' => 'POC 3',
            'primary_poc_email' => 'poc3@example.com',
            'primary_poc_phone' => '9999999999',
        ]);

        $branch = $client->branches()->create([
            'branch_name' => 'Test Branch',
        ]);

        $contact = $client->contacts()->create([
            'contact_type' => 'finance',
            'full_name' => 'Finance POC',
            'email' => 'finance@example.com',
            'phone' => '9999999999',
        ]);

        $payload = [
            'locationsCount' => 1,
            'name' => 'Updated Inc.',
            'type' => 'pvt_ltd',
            'code' => 'ORIG-03',
            'regAddressLine1' => '123 Test',
            'regCity' => 'Test',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2024-01-01',
            'poc1' => [
                'name' => 'POC 3',
                'email' => 'poc3@example.com',
                'phone' => '9999999999',
            ],
            'branches' => [
                [
                    'id' => (string)$branch->id,
                    'name' => 'Test Branch Updated',
                ]
            ],
            'contacts' => [
                [
                    'contact_type' => 'primary',
                    'name' => 'POC 3',
                    'email' => 'poc3@example.com',
                ],
                [
                    'id' => $contact->id,
                    'contact_type' => 'finance',
                    'name' => 'Finance POC',
                ]
            ]
        ];

        $response = $this->actingAs($admin)->putJson("/clients/{$client->id}", $payload);
        $response->assertStatus(302);

        $client->refresh();
        $this->assertCount(1, $client->branches);
        $this->assertEquals($branch->id, $client->branches->first()->id);
        $this->assertEquals('Test Branch Updated', $client->branches->first()->branch_name);

        echo "\n--- 3. ID STABILITY ---\n";
        echo "Branch ID before: {$branch->id} | after: {$client->branches->first()->id}\n";
    }
}
