<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Jobs\ProcessBulkUploadJob;
use App\Services\BulkUploadValidationService;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProcessBulkEmployeeUploadJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_employee_upload_job_executes_background_import_successfully()
    {
        $user = User::factory()->create(['role' => 'admin']);

        $client = Client::factory()->create([
            'company_name' => 'Job Test Client',
            'client_code' => 'JOB001',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_state' => 'Tamil Nadu',
            'status' => 'active',
        ]);

        $branch = $client->branches()->create([
            'branch_name' => 'Main Branch',
            'state' => 'Tamil Nadu',
            'is_head_office' => true,
        ]);

        $jobUuid = (string) Str::uuid();
        $filePath = storage_path("app/temp_bulk_uploads/{$jobUuid}.csv");

        if (!file_exists(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }

        $csvContent = "employee_code,full_name,client_code,branch_name,date_of_birth,date_of_joining,designation,employment_model,account_holder_name,bank_name,bank_branch,bank_account_number,bank_ifsc,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,personal_email,phone_number,residential_address\n";
        $csvContent .= "JOB_EMP_01,Job Employee One,JOB001,Main Branch,1995-01-01,2023-01-01,Developer,agency_contract,Job Employee One,State Bank of India,Main Branch,123456789012,SBIN0001234,ABCDE1234F,25000,10000,0,0,0,0,0,job_emp1@example.com,9876543210,123 Test Street\n";
        $csvContent .= "JOB_EMP_02,Job Employee Two,JOB001,Main Branch,1992-05-15,2023-01-01,Designer,agency_contract,Job Employee Two,State Bank of India,Main Branch,123456789013,SBIN0001234,ABCDE1235G,30000,12000,0,0,0,0,0,job_emp2@example.com,9876543211,456 Test Street\n";

        file_put_contents($filePath, $csvContent);

        DB::table('bulk_upload_batches')->insert([
            'id' => $jobUuid,
            'user_id' => $user->id,
            'type' => 'employee',
            'client_id' => $client->id,
            'file_name' => 'sample_import.csv',
            'file_path' => $filePath,
            'status' => 'pending',
            'total_rows' => 0,
            'processed_rows' => 0,
            'valid_count' => 0,
            'error_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $job = new ProcessBulkUploadJob(
            $jobUuid
        );

        $job->handle(app(\App\Services\FastBulkUploadService::class));

        $jobRecord = DB::table('bulk_upload_batches')->where('id', $jobUuid)->first();
        $this->assertEquals('completed', $jobRecord->status);
        $this->assertEquals(2, $jobRecord->processed_rows);
        $this->assertEquals(2, $jobRecord->valid_count);

        $emp1 = Employee::where('employee_code', 'JOB_EMP_01')->first();
        $this->assertNotNull($emp1);
        $this->assertEquals(35000.00, $emp1->gross_monthly_salary);
        $this->assertGreaterThan(0, $emp1->ctc_monthly);
        $this->assertGreaterThan(0, $emp1->employer_pf_monthly);

        $emp2 = Employee::where('employee_code', 'JOB_EMP_02')->first();
        $this->assertNotNull($emp2);
        $this->assertEquals(42000.00, $emp2->gross_monthly_salary);
    }
}
