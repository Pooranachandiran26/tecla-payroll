<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Client;
use App\Models\User;
use App\Services\BulkUploadValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\SimpleExcel\SimpleExcelWriter;
use Tests\TestCase;

class BulkUploadContractTypeValidationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $agencyClient;
    protected Client $eorClient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->agencyClient = Client::factory()->create([
            'company_name' => 'Agency Corp',
            'client_code' => 'AGN101',
            'contract_type' => 'agency',
            'health_insurance_enabled' => true,
        ]);
        \App\Models\ClientBranch::create([
            'client_id' => $this->agencyClient->id,
            'branch_name' => 'Head Office',
            'is_head_office' => true,
        ]);

        $this->eorClient = Client::factory()->create([
            'company_name' => 'EOR Corp',
            'client_code' => 'EOR202',
            'contract_type' => 'eor',
            'health_insurance_enabled' => true,
        ]);
        \App\Models\ClientBranch::create([
            'client_id' => $this->eorClient->id,
            'branch_name' => 'Head Office',
            'is_head_office' => true,
        ]);
    }

    public function test_download_template_sets_employment_model_matching_client_contract_type()
    {
        $response = $this->actingAs($this->admin)->get(route('employees.bulk-upload.download-template', [
            'client_id' => $this->agencyClient->id,
        ]));

        $response->assertStatus(200);
        $response->assertHeader('content-disposition');
    }

    public function test_bulk_upload_rejects_eor_employment_model_for_agency_client()
    {
        $service = app(BulkUploadValidationService::class);
        $tempPath = storage_path('app/temp_agency_mismatch.xlsx');
        if (file_exists($tempPath)) @unlink($tempPath);

        $writer = SimpleExcelWriter::create($tempPath)->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'account_holder_name', 'pan_number',
            'basic_pay', 'hra', 'conveyance', 'da', 'medical_allowance', 'special_allowance', 'other_additions',
            'pf_applicable', 'eps_applicable', 'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable',
            'uan_mode', 'esi_mode', 'tds_regime', 'gratuity_mode', 'lop_basis_days', 'declarations_accepted'
        ]);

        $writer->addRow([
            'employee_code' => 'AGN-001',
            'full_name' => 'John Doe',
            'client_code' => 'AGN101',
            'branch_name' => 'Head Office',
            'personal_email' => 'john.agency@example.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1995-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Engineer',
            'employment_model' => 'eor', // Mismatch! Client is Agency
            'prior_employment_flag' => '0',
            'residential_address' => '123 Street',
            'bank_account_number' => '998877665544',
            'bank_ifsc' => 'HDFC0001234',
            'account_holder_name' => 'John Doe',
            'pan_number' => 'ABCDE1234F',
            'basic_pay' => '30000',
            'hra' => '12000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '8000',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '0',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '1',
            'uan_mode' => 'new',
            'esi_mode' => 'new',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1'
        ]);
        $writer->close();

        $results = $service->validateFile($tempPath);

        $this->assertEquals(1, $results['error_count']);
        $this->assertStringContainsString("Employment model 'eor' is invalid for client 'Agency Corp'", $results['rows'][0]['message']);
        $this->assertStringContainsString("Must be 'agency_contract'", $results['rows'][0]['message']);

        unset($writer);
        if (file_exists($tempPath)) @unlink($tempPath);
    }
}
