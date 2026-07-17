<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\SimpleExcel\SimpleExcelReader;
use Tests\TestCase;

class BulkUploadClientTemplateAndPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_download_template_with_client_id_contains_reference_sheet_with_real_defaults()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create([
            'company_name' => 'Acme Corporation',
            'client_code' => 'ACME01',
            'lop_basis_days' => 30,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'lwf_applicable' => false,
            'tds_applicable' => true,
        ]);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'HQ', 'state' => 'Maharashtra']);

        $response = $this->actingAs($admin)->get(route('employees.bulk-upload.download-template', ['client_id' => $client->id]));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Save binary stream content to temp file to inspect sheets
        $tempPath = tempnam(sys_get_temp_dir(), 'test_tmpl_') . '.xlsx';
        file_put_contents($tempPath, $response->streamedContent());

        // Parse Sheet 2 (Client Defaults)
        $reader = SimpleExcelReader::create($tempPath);
        $reader->fromSheetName('Client Defaults (Read Only)');
        $rows = $reader->getRows()->toArray();

        @unlink($tempPath);

        $this->assertNotEmpty($rows);
        
        // Find LOP Basis row in Sheet 2
        $lopRow = collect($rows)->firstWhere('Setting Field', 'Default LOP Basis');
        $this->assertNotNull($lopRow);
        $this->assertEquals('30', $lopRow['Value']);

        // Find Client Code row in Sheet 2
        $codeRow = collect($rows)->firstWhere('Setting Field', 'Client Code');
        $this->assertNotNull($codeRow);
        $this->assertEquals('ACME01', $codeRow['Value']);

        // Find PF Default row in Sheet 2
        $pfRow = collect($rows)->firstWhere('Setting Field', 'PF Default');
        $this->assertNotNull($pfRow);
        $this->assertStringContainsString('1', $pfRow['Value']);
    }

    public function test_employee_code_validation_enforces_global_and_intra_file_uniqueness()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT100']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // Pre-existing employee with code EMP_EXISTING
        Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP_EXISTING',
            'personal_email' => 'existing@example.com'
        ]);

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        $row1 = "EMP_EXISTING,John Doe,CLT100,new1@example.com,9876543210,1990-01-01,2023-01-01,Engineer,eor,0,1,123 Street,12345678901,SBIN0001234,John Doe,ABCDE1234F,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        $row2 = "EMP_DUPLICATE,Jane Doe,CLT100,new2@example.com,9876543211,1991-01-01,2023-01-01,Engineer,eor,0,1,123 Street,12345678902,SBIN0001234,Jane Doe,ABCDE1234G,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        $row3 = "EMP_DUPLICATE,Bob Smith,CLT100,new3@example.com,9876543212,1992-01-01,2023-01-01,Engineer,eor,0,1,123 Street,12345678903,SBIN0001234,Bob Smith,ABCDE1234H,15000,5000,0,0,0,0,0,1,0,1,0,0\n";

        $file = UploadedFile::fake()->createWithContent('bulk_code_test.csv', $csvHeader . $row1 . $row2 . $row3);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.validate'), [
            'file' => $file
        ]);

        $response->assertStatus(200);
        $data = $response->json();

        // Row 1 should fail because EMP_EXISTING already exists in DB
        $this->assertEquals('error', $data['rows'][0]['status']);
        $this->assertStringContainsString('already registered', $data['rows'][0]['message']);

        // Row 3 should fail because EMP_DUPLICATE appears twice in the file
        $this->assertEquals('error', $data['rows'][2]['status']);
        $this->assertStringContainsString('Duplicate employee_code', $data['rows'][2]['message']);
    }

    public function test_uploading_25_rows_returns_full_dataset_for_client_side_pagination()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT200']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        
        $rows = "";
        for ($i = 1; $i <= 25; $i++) {
            $code = 'PAGINATED_' . $i;
            $email = "paginated_{$i}@example.com";
            $phone = "9" . sprintf("%09d", $i);
            $acc = "ACC" . sprintf("%08d", $i);
            $pan = "ABCDE" . sprintf("%04d", $i) . "X";
            $rows .= "{$code},Staff {$i},CLT200,{$email},{$phone},1990-01-01,2023-01-01,Engineer,eor,0,1,Address,{$acc},SBIN0001234,Staff {$i},{$pan},15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        }

        $file = UploadedFile::fake()->createWithContent('bulk_25_rows.csv', $csvHeader . $rows);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.validate'), [
            'file' => $file
        ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(25, $data['total_rows']);
        $this->assertCount(25, $data['rows']);
        $this->assertEquals(25, $data['valid_count']);
    }
}
