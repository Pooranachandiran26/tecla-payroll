<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\User;
use App\Services\BulkUploadValidationService;
use App\Services\FastBulkUploadService;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BulkUploadBranchResolutionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->actingAs($admin);
    }

    /** @test */
    public function bulk_upload_automatically_assigns_single_primary_branch_when_client_has_one_branch()
    {
        $client = Client::create([
            'company_name' => 'Single Branch Tech Ltd',
            'company_type' => 'pvt_ltd',
            'client_code' => 'SBT-001',
            'status' => 'active',
            'contract_type' => 'agency',
            'contract_start_date' => now()->toDateString(),
            'billing_model' => 'markup',
            'registered_address_line_1' => 'MG Road',
            'registered_city' => 'Bengaluru',
            'registered_state' => 'Karnataka',
            'registered_pin' => '560001',
            'primary_poc_name' => 'John Doe',
            'primary_poc_email' => 'poc@example.com',
            'primary_poc_phone' => '9876543210',
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pf_establishment_code' => 'KN/BAN/12345/000',
            'esi_code_number' => '31000123450001001',
        ]);

        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Bengaluru Head Office',
            'branch_code' => 'SBT-BLR',
            'address_line_1' => 'MG Road',
            'city' => 'Bengaluru',
            'state' => 'Karnataka',
            'pin_code' => '560001',
            'is_head_office' => true,
            'is_primary_billing_branch' => true,
        ]);

        $csvContent = implode("\n", [
            'employee_code,full_name,client_code,branch_name,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,residential_address,bank_account_number,bank_ifsc,bank_name,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,eps_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable,uan_mode,esi_mode,tds_regime,gratuity_mode,lop_basis_days,declarations_accepted',
            'EMP-SBT-01,Arun Kumar,SBT-001,,arun.sbt@example.com,9876543210,1995-05-15,2024-01-01,Developer,agency_contract,0,MG Road Bengaluru,123456789012,SBIN0001234,SBI,Arun Kumar,ABCDE1234F,25000,10000,0,0,0,5000,0,1,1,0,1,0,0,new,new,new,part_of_ctc,30,1'
        ]);

        $tempFile = tempnam(sys_get_temp_dir(), 'bulk_test_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        $fastBulkService = app(FastBulkUploadService::class);
        $batchId = (string) \Illuminate\Support\Str::uuid();
        $results = $fastBulkService->processUpload($tempFile, $batchId);

        $this->assertEquals(0, $results['error_count']);
        $this->assertEquals(1, $results['valid_count']);

        $importRes = $fastBulkService->executeBatchImport($batchId);
        $this->assertEquals(1, $importRes['imported_count']);

        $employee = Employee::where('employee_code', 'EMP-SBT-01')->firstOrFail();
        $this->assertEquals($client->id, $employee->client_id);
        $this->assertEquals($branch->id, $employee->branch_id);

        @unlink($tempFile);
    }

    /** @test */
    public function bulk_upload_resolves_multiple_branches_by_branch_name_and_branch_code()
    {
        $client = Client::create([
            'company_name' => 'Multi Branch Logistics Ltd',
            'company_type' => 'pvt_ltd',
            'client_code' => 'MBL-002',
            'status' => 'active',
            'contract_type' => 'agency',
            'contract_start_date' => now()->toDateString(),
            'billing_model' => 'markup',
            'registered_address_line_1' => 'MG Road',
            'registered_city' => 'Bengaluru',
            'registered_state' => 'Karnataka',
            'registered_pin' => '560001',
            'primary_poc_name' => 'John Doe',
            'primary_poc_email' => 'poc@example.com',
            'primary_poc_phone' => '9876543210',
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pf_establishment_code' => 'MH/PUN/67890/000',
            'esi_code_number' => '31000678900001001',
        ]);

        $branchPune = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Pune Processing Plant',
            'branch_code' => 'MBL-PUN',
            'address_line_1' => 'MIDC Pune',
            'city' => 'Pune',
            'state' => 'Maharashtra',
            'pin_code' => '410501',
            'is_head_office' => true,
            'is_primary_billing_branch' => true,
        ]);

        $branchMumbai = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'Mumbai Port Hub',
            'branch_code' => 'MBL-MUM',
            'address_line_1' => 'JNPT Port',
            'city' => 'Navi Mumbai',
            'state' => 'Maharashtra',
            'pin_code' => '400707',
            'is_head_office' => false,
            'is_primary_billing_branch' => false,
        ]);

        $csvContent = implode("\n", [
            'employee_code,full_name,client_code,branch_name,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,residential_address,bank_account_number,bank_ifsc,bank_name,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,eps_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable,uan_mode,esi_mode,tds_regime,gratuity_mode,lop_basis_days,declarations_accepted',
            'EMP-MBL-01,Kavita Nair,MBL-002,Pune Processing Plant,kavita.pune@example.com,9876543211,1993-08-20,2024-01-01,Plant Manager,agency_contract,0,Pune MIDC,123456789013,SBIN0001234,SBI,Kavita Nair,ABCDE5678F,30000,12000,0,0,0,6000,0,1,1,0,1,0,0,new,new,new,part_of_ctc,30,1',
            'EMP-MBL-02,Rohit Deshmukh,MBL-002,MBL-MUM,rohit.mum@example.com,9876543212,1991-03-10,2024-01-01,Port Officer,agency_contract,0,Navi Mumbai,123456789014,SBIN0001234,SBI,Rohit Deshmukh,ABCDE9012F,32000,12800,0,0,0,6400,0,1,1,0,1,0,0,new,new,new,part_of_ctc,30,1'
        ]);

        $tempFile = tempnam(sys_get_temp_dir(), 'bulk_test_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        $fastBulkService = app(FastBulkUploadService::class);
        $batchId = (string) \Illuminate\Support\Str::uuid();
        $results = $fastBulkService->processUpload($tempFile, $batchId);

        $this->assertEquals(0, $results['error_count']);
        $this->assertEquals(2, $results['valid_count']);

        $importRes = $fastBulkService->executeBatchImport($batchId);
        $this->assertEquals(2, $importRes['imported_count']);

        $emp1 = Employee::where('employee_code', 'EMP-MBL-01')->firstOrFail();
        $this->assertEquals($branchPune->id, $emp1->branch_id);

        $emp2 = Employee::where('employee_code', 'EMP-MBL-02')->firstOrFail();
        $this->assertEquals($branchMumbai->id, $emp2->branch_id);

        @unlink($tempFile);
    }

    /** @test */
    public function download_template_generates_template_with_client_branches_and_establishment_codes()
    {
        $client = Client::create([
            'company_name' => 'Template Testing Enterprises',
            'company_type' => 'pvt_ltd',
            'client_code' => 'TTE-003',
            'status' => 'active',
            'contract_type' => 'agency',
            'contract_start_date' => now()->toDateString(),
            'billing_model' => 'markup',
            'registered_address_line_1' => 'MG Road',
            'registered_city' => 'Bengaluru',
            'registered_state' => 'Karnataka',
            'registered_pin' => '560001',
            'primary_poc_name' => 'John Doe',
            'primary_poc_email' => 'poc@example.com',
            'primary_poc_phone' => '9876543210',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pf_establishment_code' => 'TN/MAS/99999/000',
            'esi_code_number' => '31000999990001001',
        ]);

        $client->branches()->create([
            'branch_name' => 'Chennai Main Office',
            'branch_code' => 'TTE-CHE',
            'address_line_1' => 'OMR IT Corridor',
            'city' => 'Chennai',
            'state' => 'Tamil Nadu',
            'pin_code' => '600096',
            'is_head_office' => true,
            'is_primary_billing_branch' => true,
        ]);

        $response = $this->get(route('employees.bulk-upload.template', ['client_id' => $client->id]));
        $response->assertOk();
        $this->assertTrue($response->headers->has('content-disposition'));
        $this->assertStringContainsString('Bulk_Upload_Template_TTE-003', $response->headers->get('content-disposition'));
    }
}
