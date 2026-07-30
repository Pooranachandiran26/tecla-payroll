<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BulkUploadErrorSheetExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_validate_upload_attaches_raw_data_and_identifies_exact_failed_rows()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT999']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        
        // 5 Valid Rows
        $validRows = "";
        for ($i = 1; $i <= 5; $i++) {
            $code = 'VALID_' . $i;
            $email = "valid_{$i}@example.com";
            $phone = "9" . sprintf("%09d", $i + 100);
            $acc = "ACC" . sprintf("%08d", $i + 100);
            $pan = "ABCDE" . sprintf("%04d", $i) . "X";
            $validRows .= "{$code},Staff {$i},CLT999,{$email},{$phone},1990-01-01,2023-01-01,Engineer,eor,0,1,Address,{$acc},SBIN0001234,Staff {$i},{$pan},15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        }

        // 3 Invalid Rows (Row 6 has address with commas, Row 7 has invalid email, Row 8 has missing PAN)
        $invalidRow1 = "ERR_1,Error Staff 1,CLT999,err1@example.com,9876543210,1990-01-01,2023-01-01,Engineer,eor,0,1,\"456 Park Ave, Suite 10, City, State 500001\",1234567890,SBIN0001234,Error Staff 1,INVALID_PAN,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        $invalidRow2 = "ERR_2,Error Staff 2,CLT999,not_an_email,9876543211,1990-01-01,2023-01-01,Engineer,eor,0,1,Address 2,1234567891,SBIN0001234,Error Staff 2,ABCDE5678X,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        $invalidRow3 = "ERR_3,Error Staff 3,CLT999,err3@example.com,9876543212,1990-01-01,2023-01-01,Engineer,eor,0,1,Address 3,1234567892,SBIN0001234,Error Staff 3,,15000,5000,0,0,0,0,0,1,0,1,0,0\n";

        $file = UploadedFile::fake()->createWithContent('bulk_5_valid_3_invalid.csv', $csvHeader . $validRows . $invalidRow1 . $invalidRow2 . $invalidRow3);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.validate'), [
            'file' => $file
        ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(8, $data['total_rows']);
        $this->assertEquals(5, $data['valid_count']);
        $this->assertEquals(3, $data['error_count']);

        $errorRows = array_values(array_filter($data['rows'], fn($r) => $r['status'] === 'error'));
        $this->assertCount(3, $errorRows);

        // Assert raw_data is attached to error rows
        $this->assertArrayHasKey('raw_data', $errorRows[0]);
        $this->assertEquals('ERR_1', $errorRows[0]['raw_data']['employee_code']);
        $this->assertEquals('456 Park Ave, Suite 10, City, State 500001', $errorRows[0]['raw_data']['residential_address']);
        $this->assertStringContainsString('pan number field format is invalid', strtolower($errorRows[0]['message']));

        $this->assertEquals('not_an_email', $errorRows[1]['raw_data']['personal_email']);
        $this->assertStringContainsString('personal email field must be a valid email', strtolower($errorRows[1]['message']));
    }

    public function test_execute_import_preserves_all_or_nothing_transaction_rollback()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT888']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        
        $validRow = "VALID_99,Staff Valid,CLT888,valid_99@example.com,9876543210,1990-01-01,2023-01-01,Engineer,eor,0,1,Address,1234567890,SBIN0001234,Staff Valid,ABCDE1234X,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        $invalidRow = "ERR_99,Staff Invalid,CLT888,invalid_email,9876543211,1990-01-01,2023-01-01,Engineer,eor,0,1,Address,1234567891,SBIN0001234,Staff Invalid,ABCDE5678X,15000,5000,0,0,0,0,0,1,0,1,0,0\n";

        $file = UploadedFile::fake()->createWithContent('bulk_rollback_test.csv', $csvHeader . $validRow . $invalidRow);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.execute'), [
            'file' => $file
            // Intentionally omitting 'partial_import' to prove default behavior
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'File contains validation errors.',
        ]);

        // Zero employees created
        $this->assertEquals(0, Employee::where('client_id', $client->id)->count());
    }

    public function test_default_behavior_without_partial_flag_still_rejects_entirely()
    {
        // This is explicitly added per requirements to prove the default strictness remains unchanged
        $this->test_execute_import_preserves_all_or_nothing_transaction_rollback();
    }

    public function test_partial_import_success()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT777']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        
        $validRow = "VALID_77,Staff Valid,CLT777,valid_77@example.com,9876543212,1990-01-01,2023-01-01,Engineer,eor,0,1,Address,1234567895,SBIN0001234,Staff Valid,ABCDE1234Y,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        $invalidRow = "ERR_77,Staff Invalid,CLT777,invalid_email,9876543213,1990-01-01,2023-01-01,Engineer,eor,0,1,Address,1234567896,SBIN0001234,Staff Invalid,ABCDE5678Y,15000,5000,0,0,0,0,0,1,0,1,0,0\n";

        $file = UploadedFile::fake()->createWithContent('bulk_partial_test.csv', $csvHeader . $validRow . $invalidRow);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.execute'), [
            'file' => $file,
            'partial_import' => true
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'imported_count' => 1,
            'ignored_errors_count' => 1
        ]);

        // Exactly ONE employee created (the valid one)
        $this->assertEquals(1, Employee::where('client_id', $client->id)->count());
        $this->assertEquals('VALID_77', Employee::where('client_id', $client->id)->first()->employee_code);
    }
}
