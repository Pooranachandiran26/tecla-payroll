<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\BulkUploadBatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Services\AttendanceUploadValidationService;

class AttendanceBulkUploadQueuedTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;
    protected $clientA;
    protected $clientB;
    protected $employeeA1;
    protected $employeeA2;
    protected $employeeB1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\AuthSecuritySettingsSeeder::class);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->manager = User::factory()->create(['role' => 'manager', 'status' => 'active']);

        $this->clientA = Client::factory()->create([
            'company_name' => 'Client A',
            'client_code' => 'CLA-001',
            'status' => 'active',
            'account_manager_id' => $this->manager->id,
        ]);
        $this->clientB = Client::factory()->create([
            'company_name' => 'Client B',
            'client_code' => 'CLB-001',
            'status' => 'active'
        ]);

        $branchA = \App\Models\ClientBranch::create([
            'client_id' => $this->clientA->id,
            'branch_name' => 'Branch A',
            'state' => 'Maharashtra',
            'gstin' => '27ABCDE1234F1Z5',
        ]);

        $branchB = \App\Models\ClientBranch::create([
            'client_id' => $this->clientB->id,
            'branch_name' => 'Branch B',
            'state' => 'Karnataka',
            'gstin' => '29ABCDE1234F1Z5',
        ]);

        // Create standard employees
        $this->employeeA1 = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branchA->id,
            'employee_code' => 'EMP-A01',
            'full_name' => 'Employee A1',
            'date_of_joining' => '2025-01-01',
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeea1@example.com',
            'bank_account_number' => '9999000011',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '100020003001',
        ]);

        $this->employeeA2 = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branchA->id,
            'employee_code' => 'EMP-A02',
            'full_name' => 'Employee A2',
            'date_of_joining' => '2026-08-15', // Mid-month joiner
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeea2@example.com',
            'bank_account_number' => '9999000012',
            'pan_number' => 'ABCDE1111C',
            'aadhaar_number' => '100020003003',
        ]);

        $this->employeeB1 = Employee::factory()->create([
            'client_id' => $this->clientB->id,
            'branch_id' => $branchB->id,
            'employee_code' => 'EMP-B01',
            'full_name' => 'Employee B1',
            'date_of_joining' => '2025-01-01',
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeeb1@example.com',
            'bank_account_number' => '9999000022',
            'pan_number' => 'ABCDE1111B',
            'aadhaar_number' => '100020003002',
        ]);
    }

    /**
     * Create a mock CSV content file helper.
     */
    protected function createCsvFile(array $rows): UploadedFile
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'test_attendance');
        $handle = fopen($tempFile, 'w');
        fputcsv($handle, ['target_month', 'employee_code', 'days_present', 'days_lop']);
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);

        return new UploadedFile($tempFile, 'attendance.csv', 'text/csv', null, true);
    }

    /**
     * 1. Parity Test: Runs identical file through both synchronous execute path and background queued path.
     * Asserts identical resulting attendance records.
     */
    public function test_parity_between_old_sync_path_and_new_queued_path()
    {
        // 22 working days in August 2026 for CLA-001
        $csvRows = [
            ['2026-08', 'EMP-A01', '22', '0'],
            ['2026-08', 'EMP-A02', '10', '2'], // Mid-month joiner
        ];

        // Path A: Synchronous Upload execution
        $fileA = $this->createCsvFile($csvRows);
        $syncResponse = $this->actingAs($this->admin)->post(route('payroll.attendance.upload'), [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-08',
            'file' => $fileA,
        ]);
        $syncResponse->assertRedirect();

        $syncRecords = AttendanceRecord::orderBy('attendance_date')
            ->orderBy('employee_id')
            ->get(['employee_id', 'attendance_date', 'is_present', 'is_lop'])
            ->toArray();

        // Flush attendance records table
        DB::table('attendance_records')->truncate();
        DB::table('bulk_upload_batches')->truncate();
        DB::table('attendance_upload_staging_rows')->truncate();

        // Path B: Queued Upload execution
        $fileB = $this->createCsvFile($csvRows);
        $validateResponse = $this->actingAs($this->admin)->post(route('payroll.attendance.validate'), [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-08',
            'file' => $fileB,
        ]);
        $validateResponse->assertStatus(200);
        $batchId = $validateResponse->json('batch_id');

        $asyncResponse = $this->actingAs($this->admin)->post(route('payroll.attendance.upload-async'), [
            'batch_id' => $batchId,
            'partial_import' => true
        ]);
        $asyncResponse->assertStatus(200);

        $queuedRecords = AttendanceRecord::orderBy('attendance_date')
            ->orderBy('employee_id')
            ->get(['employee_id', 'attendance_date', 'is_present', 'is_lop'])
            ->toArray();

        // Assert that the records produced are byte-for-byte identical!
        $this->assertEquals($syncRecords, $queuedRecords);
    }

    /**
     * 2. Confirms locked-period guard correctly blocks attendance uploads for locked periods.
     */
    public function test_locked_period_guard_blocks_attendance_uploads()
    {
        // Lock August 2026 for Client A
        DB::table('payroll_runs')->insert([
            'client_id' => $this->clientA->id,
            'payroll_month' => '2026-08-01',
            'status' => 'locked',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $csvRows = [
            ['2026-08', 'EMP-A01', '22', '0'],
        ];
        $file = $this->createCsvFile($csvRows);

        $response = $this->actingAs($this->admin)->post(route('payroll.attendance.validate'), [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-08',
            'file' => $file,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('already locked', $response->json('error'));
    }

    /**
     * 3. Confirms Manager scoping on Attendance History (cross-role boundary proof).
     */
    public function test_manager_scoping_on_attendance_history()
    {
        // 1. Create historical batch for Client A (Manager has access)
        $batchA = BulkUploadBatch::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $this->admin->id,
            'type' => 'attendance',
            'client_id' => $this->clientA->id,
            'target_month' => '2026-08-01',
            'file_name' => 'client_a_attendance.xlsx',
            'file_path' => '',
            'status' => 'completed',
            'total_rows' => 10,
            'valid_count' => 10,
        ]);

        // 2. Create historical batch for Client B (Manager does NOT have access)
        $batchB = BulkUploadBatch::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $this->admin->id,
            'type' => 'attendance',
            'client_id' => $this->clientB->id,
            'target_month' => '2026-08-01',
            'file_name' => 'client_b_attendance.xlsx',
            'file_path' => '',
            'status' => 'completed',
            'total_rows' => 5,
            'valid_count' => 5,
        ]);

        // Access history as Manager
        $response = $this->actingAs($this->manager)->get(route('payroll.attendance.history'));
        $response->assertStatus(200);

        // Manager must see Batch A but NOT Batch B
        $response->assertSee('client_a_attendance.xlsx');
        $response->assertDontSee('client_b_attendance.xlsx');
    }
}
