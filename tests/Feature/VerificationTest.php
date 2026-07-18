<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VerificationTest extends TestCase
{
    use RefreshDatabase;

    private function validPayload($client, $overrides = [])
    {
        return array_merge([
            'clientPartner' => $client->id,
            'branch_id' => 1,
            'employee_code' => 'TEST-002',
            'fullName' => 'Real POST Employee',
            'personalEmail' => 'realpost@test.com',
            'phone' => '4444444446',
            'dob' => '1990-01-01',
            'doj' => '2023-01-01',
            'designation' => 'Dev',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => 'Address',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main',
            'accountNo' => 'BANKPOST12346',
            'ifsc' => 'HDFC0000060',
            'accountHolder' => 'Name',
            'pan' => 'QWERT1234X',
            'uanMode' => 'existing_transfer',
            'uan' => '100000000001',
            'esiNo' => '1234567890',
            'pfToggle' => true,
            'esiToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'bonusToggle' => true,
            'taxRegime' => 'new',
            'declarations' => 'yes',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            'basicSal' => 25000,
            'hraSal' => 5000,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ], $overrides);
    }

    public function test_malformed_dob_string_submission()
    {
        $user = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        ClientBranch::factory()->create(['client_id' => $client->id]);

        $payload = $this->validPayload($client, [
            'dob' => 'invalid-date-format-string',
        ]);

        $response = $this->actingAs($user)->post('/employees', $payload);
        
        $response->assertStatus(302);
        $response->assertSessionHasErrors('date_of_birth');
        $this->assertTrue(session('errors')->has('date_of_birth'));
    }

    public function test_edit_mode_blank_salary_submission()
    {
        $user = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        ClientBranch::factory()->create(['client_id' => $client->id]);

        $createPayload = $this->validPayload($client);
        $this->actingAs($user)->post('/employees', $createPayload);
        $emp = Employee::first();

        $editPayload = $this->validPayload($client, [
            'basicSal' => '',
        ]);

        $response = $this->actingAs($user)->put("/employees/{$emp->id}", $editPayload);

        $response->assertStatus(302);
        $response->assertSessionHasErrors('basic_pay');
        $emp->refresh();
        $this->assertEquals(25000, $emp->basic_pay);
    }

    public function test_malformed_probation_end_date()
    {
        $user = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        ClientBranch::factory()->create(['client_id' => $client->id]);

        $payload = $this->validPayload($client, [
            'probationEndDate' => 'not-a-valid-date-31-02-2026',
        ]);

        $response = $this->actingAs($user)->post('/employees', $payload);

        $response->assertStatus(302);
        $response->assertSessionHasErrors('probation_end_date');
        $this->assertTrue(session('errors')->has('probation_end_date'));
    }

    public function test_missing_client_id_submission()
    {
        $user = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();

        $payload = $this->validPayload($client, [
            'clientPartner' => '',
        ]);

        $response = $this->actingAs($user)->post('/employees', $payload);

        $response->assertStatus(302);
        $response->assertSessionHasErrors('client_id');
        $this->assertTrue(session('errors')->has('client_id'));
    }
}
