<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\AttendanceUploadBatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class AttendanceUploadTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $clientA;
    protected $clientB;
    protected $employeeA;
    protected $employeeB;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed basic settings
        $this->seed(\Database\Seeders\AuthSecuritySettingsSeeder::class);

        // Create admin user
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        // Create clients
        $this->clientA = Client::factory()->create(['company_name' => 'Client A', 'status' => 'active']);
        $this->clientB = Client::factory()->create(['company_name' => 'Client B', 'status' => 'active']);

        // Create branches
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

        // Create employees
        $this->employeeA = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'branch_id' => $branchA->id,
            'employee_code' => 'EMP-A01',
            'full_name' => 'Employee A',
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeea@example.com',
            'bank_account_number' => '9999000011',
            'pan_number' => 'ABCDE1111A',
            'aadhaar_number' => '100020003001',
        ]);

        $this->employeeB = Employee::factory()->create([
            'client_id' => $this->clientB->id,
            'branch_id' => $branchB->id,
            'employee_code' => 'EMP-B01',
            'full_name' => 'Employee B',
            'status' => 'active',
            'uan_mode' => 'new',
            'personal_email' => 'employeeb@example.com',
            'bank_account_number' => '9999000022',
            'pan_number' => 'ABCDE1111B',
            'aadhaar_number' => '100020003002',
        ]);
    }

    /**
     * 1. Test template download.
     */
    public function test_download_template_returns_correct_headers_and_content()
    {
        $response = $this->actingAs($this->admin)->get('/payroll/attendance/template');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->assertHeader('Content-Disposition', 'attachment; filename=attendance_upload_template.xlsx');
    }

    /**
     * 2. Test validation preview on valid CSV data.
     */
    public function test_validate_upload_resolves_and_verifies_valid_csv()
    {
        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "EMP-A01,23,0\n";

        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 1);
        $response->assertJsonPath('error_count', 0);

        $rows = $response->json('rows');
        $this->assertEquals('valid', $rows[0]['status']);
        $this->assertEquals('exact', $rows[0]['matchType']);
        $this->assertEquals('Employee A (EMP-A01)', $rows[0]['matchedName']);
    }

    /**
     * 3. Test validation catches unknown/invalid codes.
     */
    public function test_validate_upload_detects_invalid_employee_code()
    {
        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "EMP-UNKNOWN,23,0\n";

        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 0);
        $response->assertJsonPath('error_count', 1);

        $rows = $response->json('rows');
        $this->assertEquals('invalid', $rows[0]['status']);
        $this->assertEquals('none', $rows[0]['matchType']);
        $this->assertStringContainsString("not found for this client", $rows[0]['notes']);
    }

    /**
     * 4. Test client scoping: employee from different client is invalid/not-found.
     */
    public function test_validate_upload_enforces_client_scoping()
    {
        // Try uploading Employee B (belongs to Client B) against Client A selection
        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "EMP-B01,23,0\n";

        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id, // Client A chosen
            'target_month' => '2026-07',
            'file' => $file
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 0);
        $response->assertJsonPath('error_count', 1);

        $rows = $response->json('rows');
        $this->assertEquals('invalid', $rows[0]['status']);
        $this->assertEquals('none', $rows[0]['matchType']);
        $this->assertStringContainsString("not found for this client", $rows[0]['notes']);
    }

    /**
     * 5. Test execute upload respects conflict policy:
     *    - skips live_punch records
     *    - overwrites previous uploaded records
     *    - inserts new records
     */
    public function test_execute_upload_respects_conflict_policy_and_ignores_live_punch()
    {
        // Day 1: Already has a live_punch record (should be ignored)
        $liveRecord = AttendanceRecord::create([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => '2026-07-14',
            'status' => 'present',
            'source' => 'live_punch',
            'notes' => 'Original portal clock-in'
        ]);

        // Day 2: Already has an uploaded record (should be overwritten)
        $prevUploadRecord = AttendanceRecord::create([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => '2026-07-15',
            'status' => 'half_day',
            'source' => 'uploaded',
            'notes' => 'Previous uploaded row'
        ]);

        // CSV targets:
        // July 2026 has 23 weekdays. 1 existing live_punch -> 22 available slots.
        // Upload 22 present + 0 LOP. This perfectly matches the 22 available slots.
        // It should overwrite the uploaded record on 2026-07-15 with status present,
        // and insert the remaining 21 days as present (uploaded).
        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "EMP-A01,22,0\n";

        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/upload', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file
        ]);

        // Assert redirect back to monitor
        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // 1. Assert Day 1 live_punch is UNTOUCHED
        $record1 = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->where('attendance_date', '2026-07-14')
            ->first();
        $this->assertEquals('present', $record1->status);
        $this->assertEquals('live_punch', $record1->source);
        $this->assertEquals('Original portal clock-in', $record1->notes);

        // 2. Assert Day 2 uploaded record is OVERWRITTEN/UPDATED to present
        $record2 = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->where('attendance_date', '2026-07-15')
            ->first();
        $this->assertEquals('present', $record2->status);
        $this->assertEquals('uploaded', $record2->source);

        // Assert Batch record created
        $this->assertDatabaseHas('attendance_upload_batches', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07-01 00:00:00',
            'uploaded_file_name' => 'timesheet.csv',
            'total_rows' => 1,
            'matched_rows' => 1,
        ]);
    }

    /**
     * 6. Test days count mismatch rejection.
     *    July 2026 has 23 weekdays. Upload 25 + 2 = 27. Must be rejected because days_lop > 0.
     */
    public function test_validate_upload_rejects_days_count_mismatch()
    {
        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "EMP-A01,25,2\n"; // 25 + 2 = 27 > 23 available with non-zero LOP

        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 0);
        $response->assertJsonPath('error_count', 1);

        $rows = $response->json('rows');
        $this->assertEquals('invalid', $rows[0]['status']);

        // Confirm the error message shows the overcount details using new short template
        $this->assertStringContainsString("⚠️ Numbers don't match", $rows[0]['notes']);
        $this->assertStringContainsString('entered 27 days total', $rows[0]['notes']);
    }

    /**
     * 7. Test multi-live-punch slot exclusion.
     *    Pre-seed 3 live_punch records on different weekdays.
     *    Available slots = 23 - 3 = 20.
     *
     *    Positive path: Upload 18 present + 2 LOP = 20 → valid, exact match (zero notes).
     */
    public function test_execute_upload_with_multi_live_punch_slot_exclusion()
    {
        // Pre-seed 3 live_punch records on 3 different weekdays in July 2026
        $livePunchDates = ['2026-07-01', '2026-07-06', '2026-07-10'];

        foreach ($livePunchDates as $i => $date) {
            AttendanceRecord::create([
                'employee_id' => $this->employeeA->id,
                'attendance_date' => $date,
                'status' => 'present',
                'source' => 'live_punch',
                'notes' => "Live punch #{$i}",
            ]);
        }

        // === NEGATIVE PATH: 22 + 2 = 24 but only 20 slots available ===
        $csvBad = "employee_code,days_present,days_lop\n";
        $csvBad .= "EMP-A01,22,2\n";

        $fileBad = UploadedFile::fake()->createWithContent('bad.csv', $csvBad);

        $responseBad = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $fileBad,
        ]);

        $responseBad->assertStatus(200);
        $responseBad->assertJsonPath('matched_rows', 0);
        $responseBad->assertJsonPath('error_count', 1);

        $badRows = $responseBad->json('rows');
        $this->assertEquals('invalid', $badRows[0]['status']);
        $this->assertStringContainsString("⚠️ Numbers don't match", $badRows[0]['notes']);

        // === POSITIVE PATH: 18 + 2 = 20 slots available ===
        $csvGood = "employee_code,days_present,days_lop\n";
        $csvGood .= "EMP-A01,18,2\n";

        $fileGood1 = UploadedFile::fake()->createWithContent('good1.csv', $csvGood);
        $fileGood2 = UploadedFile::fake()->createWithContent('good2.csv', $csvGood);

        // Validate first to check that exact match generates NO warnings in the notes field
        $responseValidate = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $fileGood1,
        ]);
        $responseValidate->assertStatus(200);
        $responseValidate->assertJsonPath('matched_rows', 1);
        $this->assertEquals("", $responseValidate->json('rows.0.notes'));

        $responseGood = $this->actingAs($this->admin)->post('/payroll/attendance/upload', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $fileGood2,
        ]);

        $responseGood->assertRedirect();
        $responseGood->assertSessionHasNoErrors();

        // Assert live_punch records are UNTOUCHED
        foreach ($livePunchDates as $i => $date) {
            $record = AttendanceRecord::where('employee_id', $this->employeeA->id)
                ->where('attendance_date', $date)
                ->first();
            $this->assertNotNull($record, "Live punch record for {$date} should exist");
            $this->assertEquals('present', $record->status);
            $this->assertEquals('live_punch', $record->source);
            $this->assertEquals("Live punch #{$i}", $record->notes);
        }

        // Assert exactly 20 new uploaded records were created
        $uploadedRecords = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->where('source', 'uploaded')
            ->get();
        $this->assertCount(20, $uploadedRecords);

        // Assert 18 present + 2 absent among uploaded records
        $uploadedPresent = $uploadedRecords->where('status', 'present')->count();
        $uploadedAbsent = $uploadedRecords->where('status', 'absent')->count();
        $this->assertEquals(18, $uploadedPresent);
        $this->assertEquals(2, $uploadedAbsent);

        // Assert total attendance_records count = 3 (live_punch) + 20 (uploaded) = 23
        $totalCount = AttendanceRecord::where('employee_id', $this->employeeA->id)->count();
        $this->assertEquals(23, $totalCount);
    }

    /**
     * 8. Test auto-reconcile shortfall validation.
     *    July 2026 has 23 weekdays. Upload 22 present + 0 LOP = 22 days.
     *    Shortfall is auto-reconciled: present = 22, LOP = 1.
     */
    public function test_validate_upload_auto_reconciles_shortfall()
    {
        $csvContent = "employee_code,days_present,days_lop\nEMP-A01,22,0\n";
        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 1);
        $response->assertJsonPath('error_count', 0);

        $rows = $response->json('rows');
        $this->assertEquals('valid', $rows[0]['status']);
        $this->assertStringContainsString('Warning: Shortfall', $rows[0]['notes']);
        $this->assertStringContainsString('Uploaded: 22 present / 0 LOP', $rows[0]['notes']);
        $this->assertStringContainsString('Saved: 22 present / 1 LOP', $rows[0]['notes']);
    }

    /**
     * 9. Test cap over-count with zero LOP.
     *    July 2026 has 23 weekdays. 1 existing punch on 2026-07-14. available slots = 22.
     *    Upload 23 present + 0 LOP = 23 days (exceeds available slots).
     *    Capped to 22 present + 0 LOP.
     */
    public function test_validate_upload_caps_overcount_with_zero_lop()
    {
        AttendanceRecord::create([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => '2026-07-14',
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $csvContent = "employee_code,days_present,days_lop\nEMP-A01,23,0\n";
        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 1);
        $response->assertJsonPath('error_count', 0);

        $rows = $response->json('rows');
        $this->assertEquals('valid', $rows[0]['status']);
        $this->assertStringContainsString('⚠️ Adjusted', $rows[0]['notes']);
        $this->assertStringContainsString('entered 23 present days', $rows[0]['notes']);
        $this->assertStringContainsString('automatically capped it to 22', $rows[0]['notes']);
    }

    /**
     * 10. Test reject over-count with non-zero LOP.
     *     July 2026 has 23 weekdays. 1 existing punch. available slots = 22.
     *     Upload 22 present + 1 LOP = 23 days (exceeds available slots with LOP > 0).
     *     Must be rejected.
     */
    public function test_validate_upload_rejects_overcount_with_nonzero_lop()
    {
        AttendanceRecord::where('employee_id', $this->employeeA->id)->delete();
        AttendanceRecord::create([
            'employee_id' => $this->employeeA->id,
            'attendance_date' => '2026-07-14',
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $csvContent = "employee_code,days_present,days_lop\nEMP-A01,22,1\n";
        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('total_rows', 1);
        $response->assertJsonPath('matched_rows', 0);
        $response->assertJsonPath('error_count', 1);

        $rows = $response->json('rows');
        $this->assertEquals('invalid', $rows[0]['status']);
        $this->assertStringContainsString("⚠️ Numbers don't match — you entered 23 days total, but this month only has 22 working days", $rows[0]['notes']);
    }

    /**
     * 11. Test database records created match the reconciled numbers instead of raw uploaded counts.
     */
    public function test_execute_upload_inserts_reconciled_counts_in_db()
    {
        AttendanceRecord::where('employee_id', $this->employeeA->id)->delete();
        // 23 available weekdays. Shortfall upload: 22 present + 0 LOP = 22 days.
        // Reconciled: 22 present + 1 LOP.
        $csvContent = "employee_code,days_present,days_lop\nEMP-A01,22,0\n";
        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/upload', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // Reconciled LOP should create 1 absent (LOP) record
        $uploadedLopCount = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->where('source', 'uploaded')
            ->where('status', 'absent')
            ->count();
        $this->assertEquals(1, $uploadedLopCount);

        // Reconciled present should create 22 present records
        $uploadedPresentCount = AttendanceRecord::where('employee_id', $this->employeeA->id)
            ->where('source', 'uploaded')
            ->where('status', 'present')
            ->count();
        $this->assertEquals(22, $uploadedPresentCount);
    }

    /**
     * 12. Test skipped status for employee whose DOJ is after target month:
     *     - Preview shows status = 'skipped', skipped_count = 1, and distinct note
     *     - Execute save writes ZERO attendance_records to the database
     */
    public function test_validate_and_execute_upload_handles_skipped_unjoined_employee_with_zero_db_records()
    {
        // Employee C joined July 22, 2026
        $employeeC = Employee::factory()->create([
            'client_id' => $this->clientA->id,
            'employee_code' => 'EMP-UNJOINED',
            'full_name' => 'Unjoined Employee',
            'date_of_joining' => '2026-07-22',
        ]);

        $csvContent = "employee_code,days_present,days_lop\nEMP-UNJOINED,26,0\n";
        $file1 = UploadedFile::fake()->createWithContent('timesheet1.csv', $csvContent);
        $file2 = UploadedFile::fake()->createWithContent('timesheet2.csv', $csvContent);

        // 1. Validation Preview
        $responseValidate = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-05', // May 2026 (before July 22, 2026)
            'file' => $file1,
        ]);

        $responseValidate->assertStatus(200);
        $responseValidate->assertJsonPath('total_rows', 1);
        $responseValidate->assertJsonPath('matched_rows', 0);
        $responseValidate->assertJsonPath('skipped_count', 1);
        $responseValidate->assertJsonPath('error_count', 0);

        $rows = $responseValidate->json('rows');
        $this->assertEquals('skipped', $rows[0]['status']);
        $this->assertStringContainsString('⚠️ Not yet joined — EMP-UNJOINED joined July 22, 2026. No attendance recorded for May 2026.', $rows[0]['notes']);

        // 2. Execute Upload Save Action
        $responseExecute = $this->actingAs($this->admin)->post('/payroll/attendance/upload', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-05',
            'file' => $file2,
        ]);

        $responseExecute->assertRedirect();
        $responseExecute->assertSessionHasNoErrors();

        // 3. Database Proof: ZERO attendance_records created for this employee in May 2026
        $savedCount = AttendanceRecord::where('employee_id', $employeeC->id)
            ->whereBetween('attendance_date', ['2026-05-01', '2026-05-31'])
            ->count();

        $this->assertEquals(0, $savedCount, 'Skipped employee must have ZERO attendance_records saved in DB');
    }

    /**
     * 13. Test download template as a real 2-Sheet .xlsx file with live context & piece 3 fields.
     */
    public function test_download_template_with_live_context_and_2sheet_xlsx_structure()
    {
        $response = $this->actingAs($this->admin)->get('/payroll/attendance/template?client_id=' . $this->clientA->id . '&target_month=2026-08');

        $response->assertStatus(200);
        $downloadedFilePath = $response->getFile()->getPathname();

        // Read Sheet 1 ("Attendance Entry")
        $reader1 = \Spatie\SimpleExcel\SimpleExcelReader::create($downloadedFilePath);
        if (method_exists($reader1, 'fromSheetName')) {
            $reader1->fromSheetName('Attendance Entry');
        }
        $sheet1Rows = $reader1->getRows()->toArray();

        $this->assertCount(1, $sheet1Rows);
        $this->assertEquals('2026-08', $sheet1Rows[0]['target_month']);
        $this->assertEquals('EMP-A01', $sheet1Rows[0]['employee_code']);

        // Read Sheet 2 ("Reference Info & Rules")
        $reader2 = \Spatie\SimpleExcel\SimpleExcelReader::create($downloadedFilePath);
        if (method_exists($reader2, 'fromSheetName')) {
            $reader2->fromSheetName('Reference Info & Rules');
        }
        $sheet2Rows = $reader2->getRows()->toArray();

        $this->assertGreaterThan(5, count($sheet2Rows));

        $sections = array_column($sheet2Rows, 'Section');
        $this->assertContains('Target Client', $sections);
        $this->assertContains('Cycle Ends', $sections);
        $this->assertContains('Target Lock Date', $sections);
        $this->assertContains('Target Salary Credit', $sections);

        // Feed downloaded 2-Sheet XLSX file directly to validateFile
        $validator = app(\App\Services\AttendanceUploadValidationService::class);
        $result = $validator->validateFile($downloadedFilePath, $this->clientA->id, '2026-08');

        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);
    }

    /**
     * 14. Test validate upload with matching target_month header column.
     */
    public function test_validate_upload_with_matching_target_month_header()
    {
        $csvContent = "target_month,employee_code,days_present,days_lop\n2026-07,EMP-A01,23,0\n";
        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $rows = $response->json('rows');
        $this->assertEquals('valid', $rows[0]['status']);
        $this->assertEquals("", $rows[0]['notes']);
    }

    /**
     * 15. Test validate upload with mismatch target_month header column generates warning (status stays valid).
     */
    public function test_validate_upload_with_mismatch_target_month_header_generates_warning()
    {
        $csvContent = "target_month,employee_code,days_present,days_lop\n2026-05,EMP-A01,23,0\n";
        $file = UploadedFile::fake()->createWithContent('timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07', // Page selected month: July 2026 vs Sheet specifies: May 2026
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $rows = $response->json('rows');
        $this->assertEquals('valid', $rows[0]['status']);
        $this->assertStringContainsString("⚠️ Target month mismatch — sheet specifies 'May 2026', but 'July 2026' was selected on this page. Proceeding with July 2026", $rows[0]['notes']);
    }

    /**
     * 16. Test backward compatibility: old format without target_month column processes normally.
     */
    public function test_validate_upload_backward_compatibility_with_missing_target_month_header()
    {
        $csvContent = "employee_code,days_present,days_lop\nEMP-A01,23,0\n"; // Old format (no target_month column)
        $file = UploadedFile::fake()->createWithContent('old_timesheet.csv', $csvContent);

        $response = $this->actingAs($this->admin)->post('/payroll/attendance/validate', [
            'client_id' => $this->clientA->id,
            'target_month' => '2026-07',
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $rows = $response->json('rows');
        $this->assertEquals('valid', $rows[0]['status']);
        $this->assertEquals("", $rows[0]['notes']);
    }
}
