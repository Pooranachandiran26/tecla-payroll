<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FreshCreationHashTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_creation_populates_hash_via_real_post()
    {
        $user = User::factory()->create(['role' => 'admin']);
        
        $client = \App\Models\Client::create([
            'company_name' => 'Test Client 2',
            'client_code' => 'TC' . rand(100, 999),
            'status' => 'active',
            'contract_type' => 'agency',
            'contract_start_date' => '2026-01-01',
            'billing_model' => 'markup',
            'primary_poc_name' => 'John',
            'primary_poc_email' => 'john2@test.com',
            'primary_poc_phone' => '1234567891',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '123 Test St',
            'registered_city' => 'Test City',
            'registered_state' => 'Test State',
            'registered_pin' => '123456',
        ]);
        
        \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);

        $payload = [
            'clientPartner' => $client->id,
            'fullName' => 'Real POST Employee',
            'personalEmail' => 'realpost@test.com',
            'phone' => '3333333333',
            'dob' => '1990-01-01',
            'doj' => '2023-01-01',
            'designation' => 'Dev',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => 'Address',
            'accountNo' => 'BANKPOST123',
            'ifsc' => 'HDFC0000060',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'HQ',
            'accountHolder' => 'Name',
            'pan' => 'ABCDE9999F',
            'uanMode' => 'new',
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
            'hraSal' => 0,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ];

        $response = $this->actingAs($user)->post('/employees', $payload);
        
        if ($response->status() !== 302) {
            dd($response->exception ?? $response->getContent());
        }
        $response->assertStatus(302);
        
        $employee = Employee::where('pan_number_hash', hash('sha256', 'ABCDE9999F'))->first();
        if (!$employee) {
            dd(Employee::all()->toArray());
        }
        
        $this->assertNotNull($employee);
        $this->assertNotNull($employee->pan_number_hash);
        
        echo "\n--- FRESH CREATION RAW DB ROW (pan_number, pan_number_hash) ---\n";
        $row = DB::select("SELECT id, pan_number, pan_number_hash FROM employees WHERE id = ?", [$employee->id]);
        print_r($row[0]);
    }
}
