<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\BulkUploadBatch;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;
use DB;

class BulkUploadHistoryScopingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $managerA;
    protected User $managerB;
    protected User $employeeUser;
    protected Client $clientA;
    protected Client $clientB;
    protected ClientBranch $branchA;
    protected ClientBranch $branchB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        
        $this->managerA = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerB = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        
        $this->employeeUser = User::factory()->create(['role' => 'employee', 'status' => 'active']);

        $this->clientA = Client::factory()->create(['company_name' => 'Client A Corp', 'client_code' => 'CLA']);
        $this->clientB = Client::factory()->create(['company_name' => 'Client B Ltd', 'client_code' => 'CLB']);

        $this->branchA = ClientBranch::create(['client_id' => $this->clientA->id, 'branch_code' => 'BR-A', 'branch_name' => 'Branch A', 'state' => 'TN', 'city' => 'Chennai']);
        $this->branchB = ClientBranch::create(['client_id' => $this->clientB->id, 'branch_code' => 'BR-B', 'branch_name' => 'Branch B', 'state' => 'KA', 'city' => 'Bangalore']);

        // Attach managed clients
        DB::table('client_user')->insert([
            ['user_id' => $this->managerA->id, 'client_id' => $this->clientA->id],
            ['user_id' => $this->managerB->id, 'client_id' => $this->clientB->id],
        ]);
    }

    public function test_employee_is_forbidden_from_upload_history()
    {
        $response = $this->actingAs($this->employeeUser)->get('/employees/bulk-upload/history');
        $response->assertStatus(403);
    }

    public function test_manager_only_sees_batches_for_their_assigned_clients()
    {
        $batchId1 = (string) Str::uuid();
        $batchId2 = (string) Str::uuid();

        BulkUploadBatch::create([
            'id' => $batchId1,
            'user_id' => $this->managerA->id,
            'file_name' => 'client_a_upload.xlsx',
            'file_path' => '',
            'status' => 'completed',
            'total_rows' => 10,
            'processed_rows' => 10,
            'valid_count' => 10,
            'error_count' => 0,
        ]);

        BulkUploadBatch::create([
            'id' => $batchId2,
            'user_id' => $this->managerB->id,
            'file_name' => 'client_b_upload.xlsx',
            'file_path' => '',
            'status' => 'completed',
            'total_rows' => 20,
            'processed_rows' => 20,
            'valid_count' => 20,
            'error_count' => 0,
        ]);

        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId1, 'row_no' => 1, 'client_id' => $this->clientA->id, 'full_name' => 'Emp A', 'status' => 'ready'
        ]);

        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId2, 'row_no' => 1, 'client_id' => $this->clientB->id, 'full_name' => 'Emp B', 'status' => 'ready'
        ]);

        // Manager A should ONLY see client_a_upload.xlsx
        $responseA = $this->actingAs($this->managerA)->get('/employees/bulk-upload/history');
        $responseA->assertStatus(200);
        $responseA->assertSee('client_a_upload.xlsx');
        $responseA->assertDontSee('client_b_upload.xlsx');

        // Admin should see BOTH uploads
        $responseAdmin = $this->actingAs($this->admin)->get('/employees/bulk-upload/history');
        $responseAdmin->assertStatus(200);
        $responseAdmin->assertSee('client_a_upload.xlsx');
        $responseAdmin->assertSee('client_b_upload.xlsx');
    }

    public function test_manager_viewing_multi_client_batch_only_sees_their_client_rows()
    {
        $batchId = (string) Str::uuid();

        BulkUploadBatch::create([
            'id' => $batchId,
            'user_id' => $this->admin->id,
            'file_name' => 'multi_client_batch.xlsx',
            'file_path' => '',
            'status' => 'completed',
            'total_rows' => 2,
            'processed_rows' => 2,
            'valid_count' => 2,
            'error_count' => 0,
        ]);

        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId, 'row_no' => 1, 'client_id' => $this->clientA->id, 'full_name' => 'Emp Client A', 'status' => 'ready'
        ]);

        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId, 'row_no' => 2, 'client_id' => $this->clientB->id, 'full_name' => 'Emp Client B', 'status' => 'ready'
        ]);

        // Manager A requests details for multi_client_batch
        $response = $this->actingAs($this->managerA)->get("/employees/bulk-upload/history/{$batchId}/details");
        $response->assertStatus(200);
        
        $data = $response->json();
        $this->assertCount(1, $data['rows']);
        $this->assertEquals('Emp Client A', $data['rows'][0]['full_name']);
    }

    public function test_pii_masking_for_manager_error_report_download()
    {
        $batchId = (string) Str::uuid();

        BulkUploadBatch::create([
            'id' => $batchId,
            'user_id' => $this->managerA->id,
            'file_name' => 'error_batch.xlsx',
            'file_path' => '',
            'status' => 'completed',
            'total_rows' => 1,
            'processed_rows' => 1,
            'valid_count' => 0,
            'error_count' => 1,
        ]);

        DB::table('bulk_upload_staging_rows')->insert([
            'batch_id' => $batchId,
            'row_no' => 1,
            'client_id' => $this->clientA->id,
            'full_name' => 'John Sensitive',
            'personal_email' => 'john@sensitive.com',
            'bank_account_number' => '987654321098',
            'pan_number' => 'ABCDE1234F',
            'status' => 'error',
            'error_message' => 'Invalid bank branch code',
            'raw_data' => json_encode(['bank_account_number' => '987654321098', 'pan_number' => 'ABCDE1234F']),
        ]);

        // Manager A downloads errors
        $response = $this->actingAs($this->managerA)->get("/employees/bulk-upload/history/{$batchId}/download-errors");
        $response->assertStatus(200);

        $csvContent = $response->getContent();

        // Bank Account and PAN must be masked for Manager
        $this->assertStringContainsString('XXXX-XXXX-1098', $csvContent);
        $this->assertStringContainsString('ABXXXXX4F', $csvContent);
        $this->assertStringNotContainsString('987654321098', $csvContent);
    }
}
