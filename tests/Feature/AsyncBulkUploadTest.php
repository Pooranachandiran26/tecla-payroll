<?php

namespace Tests\Feature;

use App\Jobs\ProcessBulkUploadJob;
use App\Models\BulkUploadBatch;
use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AsyncBulkUploadTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'async_admin@example.com',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Async Client Ltd',
            'client_code' => 'ASYNC01',
            'contract_type' => 'agency',
            'pf_applicable' => true,
            'esi_applicable' => false,
            'status' => 'active',
        ]);

        $this->client->branches()->create([
            'branch_name' => 'Main Branch',
            'state' => 'Maharashtra',
            'is_head_office' => true,
        ]);
    }

    public function test_async_bulk_upload_dispatches_queue_job()
    {
        Queue::fake();

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,eps_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        $csvRow = "ASYNC_EMP_1,Async Worker,ASYNC01,async1@example.com,9876543001,1992-05-15,2024-01-01,Engineer,agency_contract,0,Address 1,12345678901,SBIN0001234,Async Worker,ABCDE1234F,25000,10000,2000,0,1250,5000,0,1,1,0,1,1,1\n";

        $file = UploadedFile::fake()->createWithContent('async_upload.csv', $csvHeader . $csvRow);

        $response = $this->actingAs($this->admin)->postJson(route('employees.bulk-upload.async'), [
            'file' => $file,
            'auto_provision_users' => true,
            'partial_import' => false,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $batchId = $response->json('batch_id');
        $this->assertNotEmpty($batchId);

        $this->assertDatabaseHas('bulk_upload_batches', [
            'id' => $batchId,
            'user_id' => $this->admin->id,
        ]);

        Queue::assertPushed(ProcessBulkUploadJob::class);
    }

    public function test_process_bulk_upload_job_executes_successfully()
    {
        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,eps_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        $csvRow = "JOB_EMP_10,Job Worker,ASYNC01,job10@example.com,9876543010,1992-05-15,2024-01-01,Engineer,agency_contract,0,Address 1,12345678910,SBIN0001234,Job Worker,ABCDF1234F,25000,10000,2000,0,1250,5000,0,1,1,0,1,1,1\n";

        $filePath = storage_path('app/temp_bulk_uploads/job_test.csv');
        if (!is_dir(dirname($filePath))) {
            mkdir(dirname($filePath), 0755, true);
        }
        file_put_contents($filePath, $csvHeader . $csvRow);

        $batch = BulkUploadBatch::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $this->admin->id,
            'file_name' => 'job_test.csv',
            'file_path' => $filePath,
            'status' => 'queued',
            'auto_provision_users' => false,
            'partial_import' => false,
        ]);

        $job = new ProcessBulkUploadJob($batch->id);
        $job->handle(app(\App\Services\FastBulkUploadService::class));

        $batch->refresh();
        $this->assertEquals('completed', $batch->status);
        $this->assertEquals(1, $batch->valid_count);
        $this->assertEquals(0, $batch->error_count);

        $this->assertDatabaseHas('employees', [
            'employee_code' => 'JOB_EMP_10',
            'personal_email' => 'job10@example.com',
        ]);

        // Test status endpoint
        $statusResponse = $this->actingAs($this->admin)->getJson(route('employees.bulk-upload.status', ['batchId' => $batch->id]));
        $statusResponse->assertStatus(200);
        $statusResponse->assertJson([
            'status' => 'completed',
            'progress_percentage' => 100,
            'valid_count' => 1,
            'error_count' => 0,
        ]);
    }
}
