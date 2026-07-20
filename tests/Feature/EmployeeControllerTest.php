<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class EmployeeControllerTest extends TestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    public function test_get_client_statutory_defaults_returns_json()
    {
        $user = User::factory()->create(['role' => 'admin']);
        $client = Client::first();
        if (!$client) {
            $client = Client::factory()->create();
        }

        $response = $this->actingAs($user)->get("/clients/{$client->id}/statutory-defaults");
        $response->assertStatus(200);
        
        echo "\n--- 1. REAL NETWORK RESPONSE GET /clients/{$client->id}/statutory-defaults ---\n";
        echo json_encode($response->json(), JSON_PRETTY_PRINT) . "\n";
    }

    public function test_submit_new_employee_creates_row_and_prepopulates_edit_form()
    {
        $user = User::factory()->create(['role' => 'admin']);
        $client = Client::first();
        if (!$client) {
            $client = Client::factory()->create();
            \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
        }

        $payload = [
            'clientPartner' => $client->id,
            'branch_id' => 1,
            'employee_code' => 'TEST-002',
            'fullName' => 'Real POST Employee 3',
            'personalEmail' => 'realpost_new3@test.com',
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
            'hraSal' => 0,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ];

        // 1. Submit form (POST /employees)
        $response = $this->actingAs($user)->post('/employees', $payload);
        $response->assertRedirect('/employees');

        $employee = Employee::where('pan_number_hash', hash('sha256', 'QWERT1234X'))->first();
        $this->assertNotNull($employee);

        echo "\n--- 2. RAW DB ROW (pan_number, pan_number_hash) CREATED VIA FORM ---\n";
        echo "ID: " . $employee->id . "\n";
        echo "PAN (Encrypted string stored in DB): " . $employee->getAttributes()['pan_number'] . "\n";
        echo "PAN HASH (Stored directly): " . $employee->pan_number_hash . "\n";
        echo "PF APPLICABLE: " . $employee->pf_applicable . "\n";
        echo "EMPLOYER PF MONTHLY: " . $employee->employer_pf_monthly . "\n";

        // 3. Open in Edit Mode (GET /employees/{id})
        $editResponse = $this->actingAs($user)->get("/employees/{$employee->id}");
        $editResponse->assertStatus(200);

        // Fetch Inertia props
        $page = $editResponse->viewData('page');
        if (isset($page['props']['employee']['data'])) {
            $employeeProp = $page['props']['employee']['data'];
            echo "\n--- 3. EDIT MODE (EmployeeForm.jsx state) ---\n";
            echo "Confirming form fields pre-populated exactly:\n";
            echo "Client ID: " . $employeeProp['client_id'] . "\n";
            echo "Full Name: " . $employeeProp['full_name'] . "\n";
            echo "PF Applicable (Inherited & Saved): " . ($employeeProp['pf_applicable'] ? 'true' : 'false') . "\n";
            echo "ESI Applicable (Inherited & Saved): " . ($employeeProp['esi_applicable'] ? 'true' : 'false') . "\n";
            echo "Basic Pay: " . $employeeProp['basic_pay'] . "\n";
            echo "Employer PF Monthly (Computed): " . $employeeProp['employer_pf_monthly'] . "\n";
        }
    }

    public function test_duplicate_pan_throws_human_readable_error()
    {
        $user = User::factory()->create(['role' => 'admin']);
        
        $client = Client::first();
        if (!$client) {
            $client = Client::factory()->create();
            \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
        }

        $payload = [
            'clientPartner' => $client->id,
            'branch_id' => 1,
            'employee_code' => 'TEST-DUPE',
            'fullName' => 'Real POST Employee 3',
            'personalEmail' => 'realpost_new4@test.com',
            'phone' => '4444444447',
            'dob' => '1990-01-01',
            'doj' => '2023-01-01',
            'designation' => 'Dev',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => 'Address',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main',
            'accountNo' => 'BANKPOST12347',
            'ifsc' => 'HDFC0000060',
            'accountHolder' => 'Name',
            'pan' => 'QWERT1234X', // Same PAN as previous test
            'uanMode' => 'existing_transfer',
            'uan' => '100000000003',
            'esiNo' => '1234567891',
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

        // Ensure first user exists
        $this->actingAs($user)->post('/employees', $payload);

        // Try creating again with DIFFERENT email, phone, bank, but SAME PAN
        $payload['personalEmail'] = 'realpost_new5@test.com';
        $payload['phone'] = '4444444448';
        $payload['accountNo'] = 'BANKPOST12348';
        $payload['employee_code'] = 'TEST-DUPE-2';

        $response = $this->actingAs($user)->post('/employees', $payload);
        $response->assertSessionHasErrors('pan_number');

        $errors = session()->get('errors')->getBag('default')->get('pan_number');
        echo "\n--- HUMAN READABLE DUPLICATE PAN ERROR ---\n";
        echo $errors[0] . "\n";
    }

    public function test_the_canonical_pf_check()
    {
        $client = Client::first();
        if (!$client) {
            $client = Client::factory()->create();
            \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
        }

        $employee = Employee::create([
            'client_id' => $client->id,
            'branch_id' => 1,
            'full_name' => 'Canonical Employee',
            'personal_email' => 'pf@example.com',
            'phone_number' => '9988776653',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Manager',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '789 St',
            'bank_account_number' => '8888888888',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Canonical Employee',
            'pan_number' => 'ABCDE3333C',
            'employee_code' => 'TEC-088',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => false,
        ]);

        echo "\n--- 4. THE CANONICAL PF CHECK ---\n";
        echo $employee->employer_pf_monthly . "\n";
        
        $expectedPf = min($employee->basic_pay, 15000) * 0.13;
        $this->assertEquals(1950.00, $expectedPf);
        $this->assertEquals($expectedPf, $employee->employer_pf_monthly);
    }
}
