<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckUniqueTest extends TestCase
{
    use RefreshDatabase;

    private function createClientWithBranch()
    {
        $client = Client::factory()->create();
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    public function test_new_email_is_available()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->getJson('/employees/check-unique?field=personal_email&value=fresh@example.com');

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => true,
            'message' => null,
        ]);
    }

    public function test_taken_employee_email_is_not_available()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = $this->createClientWithBranch();
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'personal_email' => 'taken@example.com',
        ]);

        $response = $this->actingAs($admin)->getJson('/employees/check-unique?field=personal_email&value=taken@example.com');

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => false,
            'message' => 'This email address is already registered in the system.',
        ]);

        // Verify Data Privacy: response keys MUST ONLY be available and message
        $this->assertEquals(['available', 'message'], array_keys($response->json()));
    }

    public function test_own_email_with_ignore_id_is_available_in_edit_mode()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = $this->createClientWithBranch();
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'personal_email' => 'self@example.com',
        ]);

        $response = $this->actingAs($admin)->getJson("/employees/check-unique?field=personal_email&value=self@example.com&ignore_id={$employee->id}");

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => true,
            'message' => null,
        ]);
    }

    public function test_admin_user_with_null_employee_id_is_correctly_flagged_as_taken()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin_taken@test.com',
            'employee_id' => null, // Non-employee account
        ]);

        // Even when passing an ignore_id (e.g. ignore_id=999), the email 'admin_taken@test.com' belongs to an admin with NULL employee_id, so it MUST return available: false
        $response = $this->actingAs($admin)->getJson('/employees/check-unique?field=personal_email&value=admin_taken@test.com&ignore_id=999');

        $response->assertStatus(200);
        $response->assertExactJson([
            'available' => false,
            'message' => 'This email address is already registered in the system.',
        ]);

        // Verify Data Privacy masking
        $this->assertEquals(['available', 'message'], array_keys($response->json()));
    }

    public function test_phone_number_check_unique()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = $this->createClientWithBranch();
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'phone_number' => '9998887776',
        ]);

        // Taken phone
        $response1 = $this->actingAs($admin)->getJson('/employees/check-unique?field=phone_number&value=9998887776');
        $response1->assertExactJson([
            'available' => false,
            'message' => 'This phone number is already registered in the system.',
        ]);

        // Ignored owner phone
        $response2 = $this->actingAs($admin)->getJson("/employees/check-unique?field=phone_number&value=9998887776&ignore_id={$employee->id}");
        $response2->assertExactJson([
            'available' => true,
            'message' => null,
        ]);
    }
}
