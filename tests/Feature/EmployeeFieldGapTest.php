<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;

class EmployeeFieldGapTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that all 8 previously-gapped fields persist correctly
     * when submitted via the real employee update form flow.
     */
    public function test_all_8_fields_persist_on_update()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // Create a "manager" employee first so we can use it as reporting_manager_id
        $manager = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'active',
            'bank_account_number' => '9999888877',
            'pan_number' => 'ZZZZZ9999Z',
            'aadhaar_number' => '999988887777',
            'personal_email' => 'manager@test.com',
            'phone_number' => '1111111111',
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'active',
            'declarations_accepted' => 0,
            'emergency_contact_name' => null,
            'previous_employer_name' => null,
            'previous_employer_uan' => null,
            'probation_end_date' => null,
            'reporting_manager_id' => null,
            'notice_period_days' => 30,
            'esi_contribution_period_end' => null,
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active'
        ]);

        $payload = [
            'fullName' => 'Test Edit',
            'gender' => 'male',
            'bloodGroup' => 'O+',
            'maritalStatus' => 'single',
            'dob' => $employee->date_of_birth,
            'personalEmail' => 'newemail@test.com',
            'phone' => '0987654321',
            'emergencyContact' => '1122334455',
            'clientPartner' => $employee->client_id,
            'designation' => $employee->designation,
            'doj' => $employee->date_of_joining,
            'empType' => $employee->employment_model,
            'priorEmploymentFlag' => true,
            'address' => $employee->residential_address,
            'accountNo' => '99998888',
            'accountNoConfirm' => '99998888',
            'ifsc' => 'TEST0001234',
            'bankName' => 'State Bank of India',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Test Name',
            'pan' => 'ABCDE1234F',
            'aadhaar' => '123412341234',
            'uanMode' => 'new',
            'uan' => '',
            'esiNo' => '1234567890',
            'basicSal' => $employee->basic_pay,
            'hraSal' => $employee->hra,
            'conveyanceSal' => $employee->conveyance,
            'daSal' => $employee->da,
            'medicalSal' => $employee->medical_allowance,
            'specialSal' => $employee->special_allowance,
            'otherSal' => $employee->other_additions,
            'ptDeduction' => 0,
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
            // The 7 new Group A fields
            'emergencyContactName' => 'Jane Doe',
            'prevEmployerName' => 'Acme Corp',
            'prevEmployerUAN' => '100200300400',
            'probationEndDate' => '2026-12-31',
            'reportingManagerId' => $manager->id,
            'noticePeriodDays' => 60,
            'esiPeriodEnd' => '2027-03-31',
        ];

        $response = $this->actingAs($admin)->put('/employees/' . $employee->id, $payload);

        if ($response->exception) {
            echo "\nException: " . $response->exception->getMessage() . "\n";
        }

        $response->assertSessionHasNoErrors();

        $employee->refresh();

        // Group B fix: declarations_accepted should now persist
        $this->assertEquals(1, $employee->declarations_accepted, 'declarations_accepted should be 1');

        // Group A fixes: all 7 new fields should persist
        $this->assertEquals('Jane Doe', $employee->emergency_contact_name, 'emergency_contact_name should persist');
        $this->assertEquals('Acme Corp', $employee->previous_employer_name, 'previous_employer_name should persist');
        $this->assertEquals('100200300400', $employee->previous_employer_uan, 'previous_employer_uan should persist');
        $this->assertEquals('2026-12-31', $employee->probation_end_date, 'probation_end_date should persist');
        $this->assertEquals($manager->id, $employee->reporting_manager_id, 'reporting_manager_id should persist');
        $this->assertEquals(60, $employee->notice_period_days, 'notice_period_days should persist');
        $this->assertEquals('2027-03-31', $employee->esi_contribution_period_end, 'esi_contribution_period_end should persist');
    }

    /**
     * Test that notice_period_days inherits from client's default_notice_period_days
     * when not explicitly provided, via EmployeeObserver::saving().
     */
    public function test_notice_period_inherits_from_client_default()
    {
        $client = Client::factory()->create([
            'default_notice_period_days' => 45,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active'
        ]);

        $payload = [
            'fullName' => 'Inheritance Test',
            'gender' => 'male',
            'bloodGroup' => 'A+',
            'maritalStatus' => 'single',
            'dob' => '1995-01-15',
            'personalEmail' => 'inherit@test.com',
            'phone' => '9876543210',
            'emergencyContact' => '',
            'clientPartner' => $client->id,
            'designation' => 'Engineer',
            'doj' => '2026-07-01',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => '123 Test Street',
            'accountNo' => '11112222',
            'accountNoConfirm' => '11112222',
            'ifsc' => 'TEST0001234',
            'bankName' => 'Test Bank',
            'bankBranch' => 'Test Branch',
            'accountHolder' => 'Inheritance Test',
            'pan' => 'ABCDE1234F',
            'aadhaar' => '111122223333',
            'uanMode' => 'new',
            'uan' => '',
            'esiNo' => '1234567891',
            'basicSal' => 15000,
            'hraSal' => 5000,
            'conveyanceSal' => 1600,
            'daSal' => 0,
            'medicalSal' => 1250,
            'specialSal' => 2150,
            'otherSal' => 0,
            'ptDeduction' => 0,
            'pfToggle' => true,
            'esiToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'bonusToggle' => false,
            'taxRegime' => 'new',
            'declarations' => 'yes',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            // Deliberately omit noticePeriodDays to test inheritance
        ];

        $response = $this->actingAs($admin)->post('/employees', $payload);

        if ($response->exception) {
            echo "\nException: " . $response->exception->getMessage() . "\n";
        }

        $response->assertSessionHasNoErrors();

        // Find the newly created employee
        $employee = Employee::where('personal_email', 'inherit@test.com')->first();
        $this->assertNotNull($employee, 'Employee should have been created');

        // The key assertion: notice_period_days should have inherited 45 from the client
        $this->assertEquals(45, $employee->notice_period_days, 'notice_period_days should inherit 45 from client default');
    }

    /**
     * Test that notice_period_days falls back to 30 when employee is created
     * with no explicit notice_period_days (Observer resolves from client default).
     */
    public function test_notice_period_falls_back_to_30()
    {
        // Client has default_notice_period_days = 30 (the DB default)
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active'
        ]);

        $payload = [
            'fullName' => 'Fallback Test',
            'gender' => 'female',
            'bloodGroup' => 'B+',
            'maritalStatus' => 'single',
            'dob' => '1994-06-20',
            'personalEmail' => 'fallback@test.com',
            'phone' => '9876543211',
            'emergencyContact' => '',
            'clientPartner' => $client->id,
            'designation' => 'Analyst',
            'doj' => '2026-07-01',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => '456 Test Avenue',
            'accountNo' => '33334444',
            'accountNoConfirm' => '33334444',
            'ifsc' => 'TEST0005678',
            'bankName' => 'Test Bank 2',
            'bankBranch' => 'Test Branch 2',
            'accountHolder' => 'Fallback Test',
            'pan' => 'FGHIJ5678K',
            'aadhaar' => '444455556666',
            'uanMode' => 'new',
            'uan' => '',
            'esiNo' => '1234567892',
            'basicSal' => 15000,
            'hraSal' => 5000,
            'conveyanceSal' => 1600,
            'daSal' => 0,
            'medicalSal' => 1250,
            'specialSal' => 2150,
            'otherSal' => 0,
            'ptDeduction' => 0,
            'pfToggle' => true,
            'esiToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'bonusToggle' => false,
            'taxRegime' => 'new',
            'declarations' => 'yes',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            // Deliberately omit noticePeriodDays
        ];

        $response = $this->actingAs($admin)->post('/employees', $payload);

        if ($response->exception) {
            echo "\nException: " . $response->exception->getMessage() . "\n";
        }

        $response->assertSessionHasNoErrors();

        $employee = Employee::where('personal_email', 'fallback@test.com')->first();
        $this->assertNotNull($employee, 'Employee should have been created');

        // Client default is 30 (DB default), so Observer should resolve to 30
        $this->assertEquals(30, $employee->notice_period_days, 'notice_period_days should fall back to 30 (client default)');
    }

    /**
     * Test that notice_period_days inherits from client's default_notice_period_days
     * even when explicitly provided as an empty string (e.g. cleared by user in UI).
     */
    public function test_notice_period_inherits_when_empty_string()
    {
        $client = Client::factory()->create([
            'default_notice_period_days' => 45,
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active'
        ]);

        $payload = [
            'fullName' => 'Empty String Test',
            'gender' => 'male',
            'bloodGroup' => 'A+',
            'maritalStatus' => 'single',
            'dob' => '1995-01-15',
            'personalEmail' => 'emptystring@test.com',
            'phone' => '9876543212',
            'emergencyContact' => '',
            'clientPartner' => $client->id,
            'designation' => 'Engineer',
            'doj' => '2026-07-01',
            'empType' => 'eor',
            'priorEmploymentFlag' => false,
            'address' => '123 Test Street',
            'accountNo' => '55556666',
            'accountNoConfirm' => '55556666',
            'ifsc' => 'TEST0001234',
            'bankName' => 'Test Bank',
            'bankBranch' => 'Test Branch',
            'accountHolder' => 'Empty String Test',
            'pan' => 'ABCDE5678F',
            'aadhaar' => '111122223334',
            'uanMode' => 'new',
            'uan' => '',
            'esiNo' => '1234567893',
            'basicSal' => 15000,
            'hraSal' => 5000,
            'conveyanceSal' => 1600,
            'daSal' => 0,
            'medicalSal' => 1250,
            'specialSal' => 2150,
            'otherSal' => 0,
            'ptDeduction' => 0,
            'pfToggle' => true,
            'esiToggle' => true,
            'tdsToggle' => true,
            'ptToggle' => true,
            'lwfToggle' => true,
            'bonusToggle' => false,
            'taxRegime' => 'new',
            'declarations' => 'yes',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            'noticePeriodDays' => '', // Explicit empty string representing cleared input
        ];

        $response = $this->actingAs($admin)->post('/employees', $payload);

        if ($response->exception) {
            echo "\nException: " . $response->exception->getMessage() . "\n";
        }

        $response->assertSessionHasNoErrors();

        $employee = Employee::where('personal_email', 'emptystring@test.com')->first();
        $this->assertNotNull($employee, 'Employee should have been created');

        // Verify it inherited the client default of 45
        $this->assertEquals(45, $employee->notice_period_days, 'notice_period_days should inherit 45 from client default when cleared/empty string');
    }
}
