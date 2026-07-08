<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FreshCreationHashTest extends TestCase
{
    public function test_fresh_creation_populates_hash_via_real_post()
    {
        $user = User::factory()->create(['role' => 'admin']);
        
        $client = \App\Models\Client::create([
            'company_name' => 'Test Client 2',
            'contact_person' => 'John',
            'contact_email' => 'john2@test.com',
            'contact_phone' => '1234567891',
            'status' => 'active',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => true,
            'lwf_applicable' => true,
        ]);

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
            'accountHolder' => 'Name',
            'pan' => 'ABCDE9999F',
            'uanMode' => 'new',
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
            dd($response->json());
        }

        $employee = Employee::where('pan_number_hash', hash('sha256', 'ABCDE9999F'))->first();
        
        $this->assertNotNull($employee);
        $this->assertNotNull($employee->pan_number_hash);
        
        echo "\n--- FRESH CREATION RAW DB ROW (pan_number, pan_number_hash) ---\n";
        $row = DB::select("SELECT id, pan_number, pan_number_hash FROM employees WHERE id = ?", [$employee->id]);
        print_r($row[0]);
    }
}
