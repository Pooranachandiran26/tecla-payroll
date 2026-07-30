<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\AuditLog;
use App\Jobs\ProvisionBulkUploadUsersJob;
use App\Jobs\NotifyWatchersJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BulkUploadAsyncProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_durability_assertion_job_persisted_to_database_jobs_table()
    {
        Queue::fake(); // Prevent immediate execution

        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT001']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $csvHeader = "employee_code,full_name,client_code,personal_email,phone_number,date_of_birth,date_of_joining,designation,employment_model,prior_employment_flag,declarations_accepted,residential_address,bank_account_number,bank_ifsc,account_holder_name,pan_number,basic_pay,hra,conveyance,da,medical_allowance,special_allowance,other_additions,pf_applicable,esi_applicable,pt_applicable,lwf_applicable,tds_applicable\n";
        $csvRow = "EMP901,John Doe,CLT001,john.durability@example.com,9876543210,1990-01-01,2023-01-01,Engineer,eor,0,1,123 Street,1234567890,SBIN0001234,John Doe,ABCDE1234F,15000,5000,0,0,0,0,0,1,0,1,0,0\n";
        
        $file = UploadedFile::fake()->createWithContent('bulk.csv', $csvHeader . $csvRow);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.execute'), [
            'file' => $file
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'success' => true,
        ]);

        $employee = Employee::where('employee_code', 'EMP901')->firstOrFail();

        // Assert Job was queued
        Queue::assertPushed(ProvisionBulkUploadUsersJob::class, function ($job) use ($employee) {
            return in_array($employee->id, $job->employeeIds);
        });
    }

    public function test_async_execution_assertion_creates_users_and_queues_invitations()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT002']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $emp1 = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'personal_email' => 'emp1.async@example.com',
            'full_name' => 'Async Employee One',
            'bank_account_number' => '100000000001',
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '100000000001',
            'phone_number' => '9000000001',
        ]);

        $emp2 = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'personal_email' => 'emp2.async@example.com',
            'full_name' => 'Async Employee Two',
            'bank_account_number' => '100000000002',
            'pan_number' => 'AAAAA1111B',
            'aadhaar_number' => '100000000002',
            'phone_number' => '9000000002',
        ]);

        // Execute job directly
        $job = new ProvisionBulkUploadUsersJob([$emp1->id, $emp2->id], $admin->id);
        $job->handle(app(\App\Services\InvitationService::class), app(\App\Services\AuditService::class));

        // Assert Users created
        $user1 = User::where('employee_id', $emp1->id)->first();
        $user2 = User::where('employee_id', $emp2->id)->first();

        $this->assertNotNull($user1);
        $this->assertNotNull($user2);
        $this->assertEquals('invited', $user1->status);
        $this->assertEquals('invited', $user2->status);

        // Assert Batch Summary AuditLog recorded
        $summaryLog = AuditLog::where('action', 'employee.bulk_provisioning_completed')->first();
        $this->assertNotNull($summaryLog);
        $this->assertEquals(2, $summaryLog->metadata['total']);
        $this->assertEquals(2, $summaryLog->metadata['success']);
        $this->assertEquals(0, $summaryLog->metadata['failed']);
    }

    public function test_human_failure_surface_assertion_records_audit_log_and_dispatches_watcher()
    {
        Queue::fake([NotifyWatchersJob::class]);

        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['client_code' => 'CLT003']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // Pre-existing user with conflicting email
        User::factory()->create([
            'email' => 'conflict.email@example.com'
        ]);

        $validEmp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'personal_email' => 'valid.async@example.com',
            'full_name' => 'Valid Employee',
            'bank_account_number' => '100000000003',
            'pan_number' => 'AAAAA1111C',
            'aadhaar_number' => '100000000003',
            'phone_number' => '9000000003',
        ]);

        $brokenEmp = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'personal_email' => 'conflict.email@example.com', // BROKEN: Duplicate email
            'full_name' => 'Broken Employee',
            'bank_account_number' => '100000000004',
            'pan_number' => 'AAAAA1111D',
            'aadhaar_number' => '100000000004',
            'phone_number' => '9000000004',
        ]);

        // Execute job
        $job = new ProvisionBulkUploadUsersJob([$validEmp->id, $brokenEmp->id], $admin->id);
        $job->handle(app(\App\Services\InvitationService::class), app(\App\Services\AuditService::class));

        // 1. Assert failure audit log recorded for broken row
        $failureLog = AuditLog::where('action', 'employee.provisioning_failed')->first();
        $this->assertNotNull($failureLog);
        $this->assertEquals($brokenEmp->id, $failureLog->auditable_id);
        $this->assertEquals('conflict.email@example.com', $failureLog->metadata['email']);

        // 2. Assert Batch Summary AuditLog recorded
        $summaryLog = AuditLog::where('action', 'employee.bulk_provisioning_completed')->first();
        $this->assertNotNull($summaryLog);
        $this->assertEquals(2, $summaryLog->metadata['total']);
        $this->assertEquals(1, $summaryLog->metadata['success']);
        $this->assertEquals(1, $summaryLog->metadata['failed']);

        // 3. Assert NotifyWatchersJob dispatched
        Queue::assertPushed(NotifyWatchersJob::class, function ($watcherJob) {
            return str_contains($watcherJob->subject, 'Bulk Upload User Provisioning Notice');
        });
    }
}
