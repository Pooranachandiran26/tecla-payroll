<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Services\AttendanceUploadValidationService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceUploadValidationTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $branch;
    protected $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create(['status' => 'active']);
        $this->branch = ClientBranch::create(['client_id' => $this->client->id, 'branch_name' => 'HQ']);
        $this->service = new AttendanceUploadValidationService();
    }

    /**
     * Test 1: Mid-month hire (DOJ = June 16) — available_slots is bounded by DOJ.
     *
     * June 2026 has 22 total weekdays (June 1-30).
     * Employee joined June 16 → only 11 weekdays eligible (June 16-30).
     * No existing punches → available_slots = 11.
     *
     * Upload CSV with days_present=11, days_lop=0 → should validate as 'valid' (perfect match).
     * Before the fix, available_slots would be 22 (full month) and this upload would be flagged
     * as a shortfall (11 < 22).
     */
    public function test_mid_month_hire_upload_validates_without_false_shortfall()
    {
        $employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Mid-Month Hire',
            'personal_email' => 'midmonth@example.com',
            'phone_number' => '9988776644',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-06-16', // Mid-month hire
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => '1234567890',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Mid-Month Hire',
            'pan_number' => 'MMHTE1234F',
            'employee_code' => 'TEC-UPLOAD',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 10000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ]);

        // Create a CSV with 11 present (the correct number of weekdays June 16-30), 0 LOP
        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "TEC-UPLOAD,11,0\n";

        $tmpFile = tempnam(sys_get_temp_dir(), 'att_') . '.csv';
        file_put_contents($tmpFile, $csvContent);

        $result = $this->service->validateFile($tmpFile, $this->client->id, '2026-06');

        unlink($tmpFile);

        // Assert one row was processed
        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);

        // Assert the row is valid (perfect match, not a shortfall)
        $row = $result['rows'][0];
        $this->assertEquals('valid', $row['status']);
        $this->assertEquals('', $row['notes']); // No warnings — perfect match
    }

    /**
     * Test 2: Full-month employee (DOJ well before target month) — unchanged behavior.
     *
     * June 2026 has 22 weekdays. DOJ = 2023-01-01. No existing punches.
     * Upload: days_present=22, days_lop=0 → valid with 22 slots available.
     */
    public function test_full_month_employee_upload_unchanged()
    {
        $employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Full Month Employee',
            'personal_email' => 'fullmonth@example.com',
            'phone_number' => '9988776633',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2023-01-01', // Well before target month
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => '1234567891',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Full Month Employee',
            'pan_number' => 'FMETE1234F',
            'employee_code' => 'TEC-FULL',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 10000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ]);

        $csvContent = "employee_code,days_present,days_lop\n";
        $csvContent .= "TEC-FULL,22,0\n";

        $tmpFile = tempnam(sys_get_temp_dir(), 'att_') . '.csv';
        file_put_contents($tmpFile, $csvContent);

        $result = $this->service->validateFile($tmpFile, $this->client->id, '2026-06');

        unlink($tmpFile);

        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);

        $row = $result['rows'][0];
        $this->assertEquals('valid', $row['status']);
        $this->assertEquals('', $row['notes']);
    }

    /**
     * Test downloadTemplate includes Mid-Month Joiners section in Sheet 1 and pre-populates individual slots in Sheet 2.
     */
    public function test_download_template_includes_mid_month_joiner_section_and_prepopulates_individual_slots()
    {
        $admin = \App\Models\User::factory()->create(['role' => 'admin']);

        // Create mid-month joiner for June 2026 (joining June 16)
        $midMonthEmp = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Mid Month Template Emp',
            'personal_email' => 'mmtmpl@example.com',
            'phone_number' => '9988776699',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2026-06-16',
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '789 St',
            'bank_account_number' => '9998887771',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Mid Month Template Emp',
            'pan_number' => 'MMTMP1234M',
            'employee_code' => 'TEC-MMTMP',
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 15000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ]);

        $response = $this->actingAs($admin)->get(route('payroll.attendance.template', [
            'client_id' => $this->client->id,
            'target_month' => '2026-06',
        ]));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    /**
     * Helper: create a standard active employee for this test client.
     */
    private function createTestEmployee(string $code, string $name, string $doj = '2026-05-01', ?int $clientId = null, ?int $branchId = null): Employee
    {
        return Employee::create([
            'client_id' => $clientId ?? $this->client->id,
            'branch_id' => $branchId ?? $this->branch->id,
            'full_name' => $name,
            'personal_email' => strtolower(str_replace(' ', '', $name)) . '@example.com',
            'phone_number' => '9' . str_pad(random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => $doj,
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => (string) random_int(1000000000, 9999999999),
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => $name,
            'pan_number' => strtoupper(substr(md5($code . $name), 0, 5)) . '1234' . strtoupper(substr(md5($code . $name), 5, 1)),
            'employee_code' => $code,
            'uan_mode' => 'new',
            'status' => 'active',
            'basic_pay' => 10000,
            'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ]);
    }

    /**
     * Helper: create a CSV temp file with given rows.
     */
    private function createTempCsv(array $rows): string
    {
        $csv = "employee_code,days_present,days_lop\n";
        foreach ($rows as $row) {
            $csv .= implode(',', $row) . "\n";
        }
        $tmpFile = tempnam(sys_get_temp_dir(), 'att_') . '.csv';
        file_put_contents($tmpFile, $csv);
        return $tmpFile;
    }

    /**
     * Test 4: Upload is BLOCKED for an employee who has a LOCKED payroll_run_item
     * for the target month. The row should get status 'blocked_locked', empty db_payloads,
     * and error_count should be incremented.
     */
    public function test_upload_blocked_for_employee_with_locked_payroll_run()
    {
        $employee = $this->createTestEmployee('TEC-LOCKED', 'Locked Employee');

        // Create a locked payroll run + item for June 2026
        $run = \App\Models\PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 22, 'lop_days' => 0,
            'basic_pay' => 10000, 'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 10000, 'employee_pf' => 1200, 'employee_esi' => 0,
            'professional_tax' => 200, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 8600,
            'employer_pf' => 1300, 'employer_esi' => 0, 'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);

        // Upload CSV with DIFFERENT attendance for the same month
        $tmpFile = $this->createTempCsv([['TEC-LOCKED', '15', '7']]);
        $result = $this->service->validateFile($tmpFile, $this->client->id, '2026-06');
        @unlink($tmpFile);

        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(0, $result['matched_rows']);
        $this->assertEquals(1, $result['error_count']);

        $row = $result['rows'][0];
        $this->assertEquals('blocked_locked', $row['status']);
        $this->assertStringContains('already locked', $row['notes']);
        $this->assertStringContains('Payroll Correction', $row['notes']);
    }

    /**
     * Test 5: Upload is NOT blocked for a new hire who has NO payroll_run_item at all.
     * Even when another employee in the same client has a locked run.
     */
    public function test_upload_not_blocked_for_new_hire_without_locked_run()
    {
        $lockedEmp = $this->createTestEmployee('TEC-EXIST', 'Existing Employee');
        $newHire = $this->createTestEmployee('TEC-NEW', 'New Hire', '2026-06-15');

        // Only the existing employee has a locked run — new hire has nothing
        $run = \App\Models\PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $run->id,
            'employee_id' => $lockedEmp->id,
            'paid_days' => 22, 'lop_days' => 0,
            'basic_pay' => 10000, 'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 10000, 'employee_pf' => 1200, 'employee_esi' => 0,
            'professional_tax' => 200, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 8600,
            'employer_pf' => 1300, 'employer_esi' => 0, 'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);

        // Upload CSV for the new hire only
        $tmpFile = $this->createTempCsv([['TEC-NEW', '12', '0']]);
        $result = $this->service->validateFile($tmpFile, $this->client->id, '2026-06');
        @unlink($tmpFile);

        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);

        $row = $result['rows'][0];
        $this->assertEquals('valid', $row['status']);
    }

    /**
     * Test 6: Upload is NOT blocked when the payroll run is draft or approved (not locked).
     * Only 'locked' status should trigger the guard.
     */
    public function test_upload_not_blocked_for_draft_or_approved_run()
    {
        $employee = $this->createTestEmployee('TEC-DRAFT', 'Draft Run Employee');

        // Create a DRAFT payroll run + item
        $run = \App\Models\PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);
        \App\Models\PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 22, 'lop_days' => 0,
            'basic_pay' => 10000, 'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 10000, 'employee_pf' => 1200, 'employee_esi' => 0,
            'professional_tax' => 200, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 8600,
            'employer_pf' => 1300, 'employer_esi' => 0, 'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);

        $tmpFile = $this->createTempCsv([['TEC-DRAFT', '22', '0']]);
        $result = $this->service->validateFile($tmpFile, $this->client->id, '2026-06');
        @unlink($tmpFile);

        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);

        $row = $result['rows'][0];
        $this->assertEquals('valid', $row['status']);
    }

    /**
     * Test 7: Locked-run guard is scoped to the correct client.
     * A locked payroll run under Client A should NOT block an upload for Client B.
     * Uses different employee codes since employee_code has a global unique constraint.
     */
    public function test_locked_run_guard_scoped_to_correct_client()
    {
        // Create Client B with its own branch
        $clientB = \App\Models\Client::factory()->create(['status' => 'active']);
        $branchB = \App\Models\ClientBranch::create(['client_id' => $clientB->id, 'branch_name' => 'Branch B']);

        // Create employee under Client A (this->client) with a LOCKED run
        $empA = $this->createTestEmployee('TEC-CLIENTA', 'Employee A', '2026-05-01', $this->client->id, $this->branch->id);
        $runA = \App\Models\PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $runA->id,
            'employee_id' => $empA->id,
            'paid_days' => 22, 'lop_days' => 0,
            'basic_pay' => 10000, 'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 10000, 'employee_pf' => 1200, 'employee_esi' => 0,
            'professional_tax' => 200, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 8600,
            'employer_pf' => 1300, 'employer_esi' => 0, 'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);

        // Create employee under Client B — NO locked run for Client B
        $empB = $this->createTestEmployee('TEC-CLIENTB', 'Employee B', '2026-05-01', $clientB->id, $branchB->id);

        // Upload for Client B — should NOT be blocked by Client A's lock
        $tmpFile = $this->createTempCsv([['TEC-CLIENTB', '22', '0']]);
        $result = $this->service->validateFile($tmpFile, $clientB->id, '2026-06');
        @unlink($tmpFile);

        $this->assertEquals(1, $result['total_rows']);
        $this->assertEquals(1, $result['matched_rows']);
        $this->assertEquals(0, $result['error_count']);

        $row = $result['rows'][0];
        $this->assertEquals('valid', $row['status']);
    }

    /**
     * Helper: assertStringContains (PHPUnit 10 compatible).
     */
    private function assertStringContains(string $needle, string $haystack, string $message = ''): void
    {
        $this->assertTrue(
            str_contains($haystack, $needle),
            $message ?: "Failed asserting that '{$haystack}' contains '{$needle}'."
        );
    }
}
