<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\AuditLog;
use App\Jobs\ProvisionBulkUploadUsersJob;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\Attributes\Test;

class BulkUploadAdvancedOptionsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * TEST 1: auto_provision_users = true (default behavior) dispatches ProvisionBulkUploadUsersJob.
     */
    #[Test]
    public function test_auto_provision_users_true_dispatches_user_provisioning_job(): void
    {
        Queue::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['company_name' => 'Prov Corp', 'client_code' => 'PRV001']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $filename = 'test_prov_true_' . time() . '.xlsx';
        $filePath = storage_path('app/temp_bulk_uploads/' . $filename);
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($filePath);
        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code'
        ]);

        $writer->addRow([
            'employee_code' => 'PRV101',
            'full_name' => 'Prov Employee True',
            'client_code' => 'PRV001',
            'branch_name' => 'Main',
            'personal_email' => 'provtrue@example.com',
            'phone_number' => '9877112233',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Engineer',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '123 Prov St',
            'bank_account_number' => '112233445501',
            'bank_ifsc' => 'HDFC0000001',
            'bank_name' => 'HDFC',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Prov Employee True',
            'pan_number' => 'ABCDE1234A',
            'basic_pay' => '15000',
            'hra' => '5000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '1',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => ''
        ]);
        $writer->close();

        $file = new UploadedFile($filePath, $filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.execute'), [
            'file' => $file,
            'auto_provision_users' => true,
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment(['imported_count' => 1, 'auto_provision_users' => true]);

        Queue::assertPushed(ProvisionBulkUploadUsersJob::class);

        $this->assertDatabaseHas('employees', [
            'personal_email' => 'provtrue@example.com',
            'employee_code' => 'PRV101'
        ]);
    }

    /**
     * TEST 2: auto_provision_users = false skips ProvisionBulkUploadUsersJob, creates employee DB record,
     * and logs 'auto_provision_users' => false and employee_ids in Audit Log metadata (Option A).
     */
    #[Test]
    public function test_auto_provision_users_false_skips_user_provisioning_and_logs_metadata(): void
    {
        Queue::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create(['company_name' => 'NoProv Corp', 'client_code' => 'NOP001']);
        ClientBranch::factory()->create(['client_id' => $client->id, 'branch_name' => 'Main']);

        $filename = 'test_prov_false_' . time() . '.xlsx';
        $filePath = storage_path('app/temp_bulk_uploads/' . $filename);
        if (!is_dir(storage_path('app/temp_bulk_uploads'))) {
            mkdir(storage_path('app/temp_bulk_uploads'), 0755, true);
        }

        $writer = \Spatie\SimpleExcel\SimpleExcelWriter::create($filePath);
        $writer->nameCurrentSheet('Employee Data');
        $writer->addHeader([
            'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
            'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
            'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
            'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
            'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
            'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
            'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
            'declarations_accepted', 'reporting_manager_code'
        ]);

        $writer->addRow([
            'employee_code' => 'NOP101',
            'full_name' => 'Prov Employee False',
            'client_code' => 'NOP001',
            'branch_name' => 'Main',
            'personal_email' => 'provfalse@example.com',
            'phone_number' => '9877112244',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-01-01',
            'designation' => 'Engineer',
            'employment_model' => 'eor',
            'prior_employment_flag' => '0',
            'residential_address' => '124 Prov St',
            'bank_account_number' => '112233445502',
            'bank_ifsc' => 'HDFC0000001',
            'bank_name' => 'HDFC',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Prov Employee False',
            'pan_number' => 'ABCDE1234B',
            'basic_pay' => '15000',
            'hra' => '5000',
            'conveyance' => '0',
            'da' => '0',
            'medical_allowance' => '0',
            'special_allowance' => '0',
            'other_additions' => '0',
            'pf_applicable' => '1',
            'eps_applicable' => '1',
            'esi_applicable' => '1',
            'pt_applicable' => '1',
            'lwf_applicable' => '0',
            'tds_applicable' => '0',
            'uan_mode' => 'new',
            'uan_number' => '',
            'esi_mode' => 'new',
            'esic_number' => '',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => '1',
            'reporting_manager_code' => ''
        ]);
        $writer->close();

        $file = new UploadedFile($filePath, $filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $response = $this->actingAs($admin)->postJson(route('employees.bulk-upload.execute'), [
            'file' => $file,
            'auto_provision_users' => false,
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment(['imported_count' => 1, 'auto_provision_users' => false]);

        // Assert job WAS NOT pushed
        Queue::assertNotPushed(ProvisionBulkUploadUsersJob::class);

        // Assert employee created normally
        $employee = Employee::where('personal_email', 'provfalse@example.com')->first();
        $this->assertNotNull($employee);

        // Assert Audit Log metadata contains Option A fields
        $audit = AuditLog::where('action', 'employee.bulk_imported')->latest()->first();
        $this->assertNotNull($audit);
        $meta = is_array($audit->metadata) ? $audit->metadata : json_decode($audit->metadata, true);
        $this->assertFalse($meta['auto_provision_users']);
        $this->assertContains($employee->id, $meta['employee_ids']);
    }
}
