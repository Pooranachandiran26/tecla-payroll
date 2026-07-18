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
        $this->assertCount(11, $row['db_payloads']); // 11 daily records generated
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
        $this->assertCount(22, $row['db_payloads']);
    }
}
