<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientCheckUniqueTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_client_code_is_available()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->getJson('/clients/check-unique?field=client_code&value=NEW-CODE-99');

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => true,
            'message' => null,
        ]);
    }

    public function test_taken_client_code_is_not_available()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Client::factory()->create([
            'client_code' => 'TAKEN-100',
        ]);

        $response = $this->actingAs($admin)->getJson('/clients/check-unique?field=client_code&value=TAKEN-100');

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => false,
            'message' => 'This Client Code is already in use by another client.',
        ]);

        // Assert Data Privacy: Payload keys MUST ONLY be available and message
        $this->assertEquals(['available', 'message'], array_keys($response->json()));
    }

    public function test_own_client_code_with_ignore_id_is_available_in_edit_mode()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create([
            'client_code' => 'SELF-CODE-200',
        ]);

        $response = $this->actingAs($admin)->getJson("/clients/check-unique?field=client_code&value=SELF-CODE-200&ignore_id={$client->id}");

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => true,
            'message' => null,
        ]);
    }

    public function test_gstin_check_unique_against_main_and_branch_gstin()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create([
            'gstin' => '27AAACM1234A1Z1',
        ]);
        ClientBranch::factory()->create([
            'client_id' => $client->id,
            'gstin' => '33AAACM5678B1Z2',
        ]);

        // Taken main client gstin
        $res1 = $this->actingAs($admin)->getJson('/clients/check-unique?field=gstin&value=27AAACM1234A1Z1');
        $res1->assertExactJson([
            'available' => false,
            'message' => 'This GSTIN is already registered for another client or branch.',
        ]);

        // Taken branch gstin
        $res2 = $this->actingAs($admin)->getJson('/clients/check-unique?field=gstin&value=33AAACM5678B1Z2');
        $res2->assertExactJson([
            'available' => false,
            'message' => 'This GSTIN is already registered for another client or branch.',
        ]);

        // Ignored owner client gstin
        $res3 = $this->actingAs($admin)->getJson("/clients/check-unique?field=gstin&value=27AAACM1234A1Z1&ignore_id={$client->id}");
        $res3->assertExactJson([
            'available' => true,
            'message' => null,
        ]);
    }
}
