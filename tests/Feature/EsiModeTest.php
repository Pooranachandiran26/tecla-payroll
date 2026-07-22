<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeDocument;

class EsiModeTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->client = Client::factory()->create(['status' => 'active']);
        $this->branch = ClientBranch::factory()->create(['client_id' => $this->client->id]);
    }

    public function test_can_create_employee_with_esi_mode_new_and_null_esic_number()
    {
        $payload = [
            'clientPartner' => $this->client->id,
            'fullName' => 'New ESI Worker',
            'personalEmail' => 'newesiworker@example.com',
            'phone' => '9876543210',
            'dob' => '1995-05-15',
            'doj' => '2026-07-01',
            'designation' => 'Software Engineer',
            'empType' => 'agency_contract',
            'priorEmploymentFlag' => false,
            'address' => '123 Main Street',
            'accountNo' => '123456789012',
            'ifsc' => 'HDFC0000001',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'New ESI Worker',
            'pan' => 'ABCDE1234F',
            'aadhaar' => '123456789012',
            'uanMode' => 'new',
            'pfToggle' => true,
            'esiToggle' => true,
            'esiMode' => 'new',
            'esiNo' => '', // blank / null for new ESI mode
            'basicSal' => 15000,
            'hraSal' => 5000,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'taxRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            'declarations' => 'yes',
        ];

        $response = $this->actingAs($this->admin)->post(route('employees.store'), $payload);

        $response->assertRedirect(route('employees.index'));

        $this->assertDatabaseHas('employees', [
            'personal_email' => 'newesiworker@example.com',
            'esi_applicable' => true,
            'esi_mode' => 'new',
            'esic_number' => null,
        ]);
    }

    public function test_validation_fails_for_existing_esi_mode_without_10_digit_esic_number()
    {
        $payload = [
            'clientPartner' => $this->client->id,
            'fullName' => 'Existing ESI Worker',
            'personalEmail' => 'existingsiworker@example.com',
            'phone' => '9876543211',
            'dob' => '1995-05-15',
            'doj' => '2026-07-01',
            'designation' => 'Software Engineer',
            'empType' => 'agency_contract',
            'priorEmploymentFlag' => false,
            'address' => '123 Main Street',
            'accountNo' => '123456789013',
            'ifsc' => 'HDFC0000001',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Existing ESI Worker',
            'pan' => 'ABCDE1235F',
            'aadhaar' => '123456789013',
            'uanMode' => 'new',
            'pfToggle' => true,
            'esiToggle' => true,
            'esiMode' => 'existing_transfer',
            'esiNo' => '', // missing 10-digit number for existing ESI mode
            'basicSal' => 15000,
            'hraSal' => 5000,
            'taxRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'declarations' => 'yes',
        ];

        $response = $this->actingAs($this->admin)->post(route('employees.store'), $payload);

        $response->assertSessionHasErrors(['esic_number']);
    }

    public function test_can_create_employee_with_esi_mode_existing_and_valid_esic_number()
    {
        $payload = [
            'clientPartner' => $this->client->id,
            'fullName' => 'Existing ESI Valid Worker',
            'personalEmail' => 'validesiworker@example.com',
            'phone' => '9876543212',
            'dob' => '1995-05-15',
            'doj' => '2026-07-01',
            'designation' => 'Software Engineer',
            'empType' => 'agency_contract',
            'priorEmploymentFlag' => false,
            'address' => '123 Main Street',
            'accountNo' => '123456789014',
            'ifsc' => 'HDFC0000001',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Existing ESI Valid Worker',
            'pan' => 'ABCDE1236F',
            'aadhaar' => '123456789014',
            'uanMode' => 'new',
            'pfToggle' => true,
            'esiToggle' => true,
            'esiMode' => 'existing_transfer',
            'esiNo' => '1234567890',
            'basicSal' => 15000,
            'hraSal' => 5000,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
            'taxRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '26',
            'declarations' => 'yes',
        ];

        $response = $this->actingAs($this->admin)->post(route('employees.store'), $payload);

        $response->assertRedirect(route('employees.index'));

        $this->assertDatabaseHas('employees', [
            'personal_email' => 'validesiworker@example.com',
            'esi_applicable' => true,
            'esi_mode' => 'existing_transfer',
            'esic_number' => '1234567890',
        ]);
    }

    public function test_employee_with_esi_applicable_mode_new_null_esic_number_reaches_active_status_normally()
    {
        \Illuminate\Support\Facades\Mail::fake();

        $employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'status' => 'onboarding',
            'esi_applicable' => true,
            'esi_mode' => 'new',
            'esic_number' => null,
            'prior_employment_flag' => 0,
        ]);

        $requiredTypes = $employee->required_document_types;
        $documents = [];
        foreach ($requiredTypes as $type) {
            $documents[] = EmployeeDocument::create([
                'employee_id' => $employee->id,
                'document_type' => $type,
                'file_path' => 'documents/dummy.pdf',
                'status' => 'pending',
            ]);
        }

        // Verify each document via controller endpoint to trigger auto-activation logic
        foreach ($documents as $doc) {
            $response = $this->actingAs($this->admin)->put(route('employees.documents.verify', [$employee->id, $doc->id]), [
                'status' => 'verified',
            ]);
            $response->assertSessionHasNoErrors();
        }

        // Assert employee auto-activates to 'active' status cleanly despite null esic_number
        $this->assertEquals('active', $employee->fresh()->status);
    }
}
