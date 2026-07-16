<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\EmployeeDocument;
use App\Models\EmployeeExit;
use App\Services\AttendanceResolutionService;
use App\Services\PayrollEligibilityService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollEligibilityTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $branch;
    protected $employee;
    protected $attendanceService;
    protected $eligibilityService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create(['status' => 'active']);
        $this->branch = ClientBranch::create(['client_id' => $this->client->id, 'branch_name' => 'HQ']);
        
        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Test Employee',
            'personal_email' => 'test.eligibility@example.com',
            'phone_number' => '9988776655',
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Developer',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => '1234567890',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Test Employee',
            'pan_number' => 'ABCDE1234F',
            'employee_code' => 'TEC-999',
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

        // Verify required documents to bypass document gating
        foreach ($this->employee->required_document_types as $type) {
            EmployeeDocument::create([
                'employee_id' => $this->employee->id,
                'document_type' => $type,
                'file_path' => 'test.pdf',
                'status' => 'verified',
            ]);
        }

        $this->attendanceService = new AttendanceResolutionService();
        $this->eligibilityService = new PayrollEligibilityService();
    }

    /**
     * Test 1: Full month of live_punch present days yields paid_days = calendar days, lop_days = 0.
     */
    public function test_full_month_present_days()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';
        
        $start = Carbon::parse($monthStart);
        $end = Carbon::parse($monthEnd);

        // Seed attendance records for weekdays
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $result = $this->attendanceService->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        $this->assertEquals(30, $result['paid_days']); // 22 weekdays + 8 weekends = 30
        $this->assertEquals(0, $result['lop_days']);
        $this->assertEquals('live_punch', $result['attendance_source']);
    }

    /**
     * Test 2: 5 approved leave days count as PAID, not LOP.
     */
    public function test_approved_leave_counts_as_paid()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';
        
        // 5 working days are present
        // 5 working days are on leave
        // 12 working days are present
        // 8 weekends (no records, defaults to paid)
        $start = Carbon::parse($monthStart);
        $end = Carbon::parse($monthEnd);

        $dayIndex = 0;
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                $dayIndex++;
                $status = ($dayIndex >= 6 && $dayIndex <= 10) ? 'on_leave' : 'present';
                
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => $status,
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $result = $this->attendanceService->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        $this->assertEquals(30, $result['paid_days']); // All 30 days are paid (17 present + 5 on_leave + 8 weekends)
        $this->assertEquals(0, $result['lop_days']);
    }

    /**
     * Test 3: Missing bank details excludes employee with correct reason.
     */
    public function test_missing_bank_details_excludes()
    {
        $this->employee->update([
            'bank_account_number' => '',
            'bank_ifsc' => '',
        ]);

        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');

        $this->assertFalse($result['is_eligible']);
        $this->assertContains('Incomplete bank details', $result['exclusions']);
    }

    /**
     * Test 4: Suspended status excludes employee with correct reason.
     */
    public function test_suspended_status_excludes()
    {
        $this->employee->update(['status' => 'suspended']);

        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');

        $this->assertFalse($result['is_eligible']);
        $this->assertContains('Employee status: suspended', $result['exclusions']);
    }

    /**
     * Test 5: Documents not verified excludes employee with correct reason.
     */
    public function test_unverified_documents_excludes()
    {
        // Delete all verified documents
        EmployeeDocument::where('employee_id', $this->employee->id)->delete();

        // Create one unverified document
        EmployeeDocument::create([
            'employee_id' => $this->employee->id,
            'document_type' => 'pan_card',
            'file_path' => 'test.pdf',
            'status' => 'pending',
        ]);

        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');

        $this->assertFalse($result['is_eligible']);
        $this->assertContains('Documents not verified', $result['exclusions']);
    }

    /**
     * Test 6: In-progress exit request excludes employee with correct reason.
     */
    public function test_in_progress_exit_excludes()
    {
        EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'current_stage' => 3,
            'settlement_status' => 'draft',
        ]);

        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');

        $this->assertFalse($result['is_eligible']);
        $this->assertContains('Employee in exit process', $result['exclusions']);
    }

    /**
     * Test 7: No attendance data and no leave excludes employee.
     */
    public function test_no_attendance_data_and_no_leave_excludes()
    {
        // 1. Ensure no attendance records exist for the month
        DB::table('attendance_records')->where('employee_id', $this->employee->id)->delete();

        // 2. Ensure no leave requests exist
        DB::table('leave_requests')->where('employee_id', $this->employee->id)->delete();

        // 3. Verify they are excluded due to no attendance
        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');
        $this->assertFalse($result['is_eligible']);
        $this->assertContains('No attendance data', $result['exclusions']);

        // 4. Seed approved leave request in the target month
        DB::table('leave_requests')->insert([
            'employee_id' => $this->employee->id,
            'from_date' => '2026-06-10',
            'to_date' => '2026-06-15',
            'days_count' => 6.0,
            'status' => 'approved',
            'reason' => 'Test Vacation',
            'leave_type' => 'casual',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 5. Verify the exclusion is now gone
        $resultWithLeave = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');
        $this->assertNotContains('No attendance data', $resultWithLeave['exclusions']);
    }

    /**
     * Test 8: All warning flags (pending bank change, mid-month revision, ESI threshold) fire.
     */
    public function test_warning_flags_fire_properly()
    {
        // Setup attendance records so that "no attendance data" doesn't trigger
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-06-10',
            'status' => 'present',
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 1. Create a pending bank change request
        DB::table('bank_change_requests')->insert([
            'employee_id' => $this->employee->id,
            'status' => 'pending',
            'new_bank_account_number' => '9999999999',
            'new_bank_ifsc' => 'ICIC0001111',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create a mid-month salary revision
        DB::table('salary_revisions')->insert([
            'employee_id' => $this->employee->id,
            'effective_date' => '2026-06-15',
            'old_basic_pay' => 10000,
            'old_hra' => 0,
            'old_conveyance' => 0,
            'old_da' => 0,
            'old_medical_allowance' => 0,
            'old_special_allowance' => 0,
            'old_other_additions' => 0,
            'old_net_take_home' => 10000,
            'old_ctc' => 12000,
            'new_basic_pay' => 15000,
            'new_hra' => 5000,
            'new_conveyance' => 0,
            'new_da' => 0,
            'new_medical_allowance' => 0,
            'new_special_allowance' => 0,
            'new_other_additions' => 0,
            'new_net_take_home' => 15000,
            'new_ctc' => 18000,
            'status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Set gross salary components near threshold (e.g. ₹20,000)
        $this->employee->update([
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);

        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, '2026-06-01', '2026-06-30');

        // Confirm warnings fired
        $this->assertContains('Pending bank change request', $result['warnings']);
        $this->assertContains('Salary revision with effective date inside this payroll month', $result['warnings']);
        $this->assertContains('Employee near the ESI ₹21,000 threshold', $result['warnings']);
    }

    /**
     * Test 9: An incomplete punch record (punch-in set, punch-out null, status null)
     * is resolved as LOP and returned in incomplete_punches.
     */
    public function test_punch_in_no_punch_out_is_flagged_as_anomaly_and_treated_as_lop()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';
        $start = Carbon::parse($monthStart);
        $end = Carbon::parse($monthEnd);

        // Seed 1 incomplete punch on June 15
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-06-15',
            'punch_in_time' => '09:00:00',
            'punch_out_time' => null,
            'status' => null,
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Seed other weekdays as present
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend() && $date->toDateString() !== '2026-06-15') {
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $result = $this->attendanceService->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        $this->assertEquals(29, $result['paid_days']); // 30 - 1 incomplete = 29
        $this->assertEquals(1, $result['lop_days']);
        $this->assertContains('2026-06-15', $result['incomplete_punches']);
    }

    /**
     * Test 10: An unrecognized status (e.g. 'unknown_status') is resolved as LOP
     * and returned in unexpected_records (bypassing SQLite CHECK constraints using mocks).
     */
    public function test_unrecognized_status_is_flagged_as_anomaly_and_treated_as_lop()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';
        $start = Carbon::parse($monthStart);
        $end = Carbon::parse($monthEnd);

        $records = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                if ($date->toDateString() === '2026-06-15') {
                    $records[] = (object)[
                        'employee_id' => $this->employee->id,
                        'attendance_date' => '2026-06-15',
                        'punch_in_time' => '09:00:00',
                        'punch_out_time' => '18:00:00',
                        'status' => 'unknown_status',
                        'source' => 'live_punch',
                    ];
                } else {
                    $records[] = (object)[
                        'employee_id' => $this->employee->id,
                        'attendance_date' => $date->toDateString(),
                        'punch_in_time' => '09:00:00',
                        'punch_out_time' => '18:00:00',
                        'status' => 'present',
                        'source' => 'live_punch',
                    ];
                }
            }
        }

        $mockQuery = \Mockery::mock();
        $mockQuery->shouldReceive('where')->with('employee_id', $this->employee->id)->andReturnSelf();
        $mockQuery->shouldReceive('whereBetween')->with('attendance_date', [$monthStart, $monthEnd])->andReturnSelf();
        $mockQuery->shouldReceive('get')->andReturn(collect($records));

        $originalDb = DB::getFacadeRoot();
        DB::shouldReceive('table')->with('attendance_records')->andReturn($mockQuery);

        $result = $this->attendanceService->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        DB::swap($originalDb);

        $this->assertEquals(29, $result['paid_days']); // 30 - 1 unrecognized = 29
        $this->assertEquals(1, $result['lop_days']);
        
        $unexpectedList = $result['unexpected_records'];
        $this->assertCount(1, $unexpectedList);
        $this->assertEquals('2026-06-15', $unexpectedList[0]['date']);
        $this->assertEquals('unknown_status', $unexpectedList[0]['status']);
    }

    /**
     * Test 11: Incomplete punch warning fires correctly in eligibility checks (single & multiple cases).
     */
    public function test_incomplete_punch_warning_fires_in_eligibility_service()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        // 1. Single incomplete punch
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-06-15',
            'punch_in_time' => '09:00:00',
            'punch_out_time' => null,
            'status' => null,
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resultSingle = $this->eligibilityService->checkEmployee($this->employee, $this->client, $monthStart, $monthEnd);
        $this->assertContains(
            "1 incomplete punch (no punch-out) is found on 2026-06-15 — verify before processing",
            $resultSingle['warnings']
        );

        // 2. Multiple incomplete punches (add a second one)
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-06-16',
            'punch_in_time' => '09:00:00',
            'punch_out_time' => null,
            'status' => null,
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resultMultiple = $this->eligibilityService->checkEmployee($this->employee, $this->client, $monthStart, $monthEnd);
        $this->assertContains(
            "2 incomplete punches (no punch-out) are found on 2026-06-15, 2026-06-16 — verify before processing",
            $resultMultiple['warnings']
        );
    }

    /**
     * Test 12: Unexpected status warning fires correctly in eligibility checks.
     */
    public function test_unexpected_status_warning_fires_in_eligibility_service()
    {
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        $mockResolution = [
            'paid_days' => 29.0,
            'lop_days' => 1.0,
            'attendance_source' => 'live_punch',
            'incomplete_punches' => [],
            'unexpected_records' => [
                [
                    'date' => '2026-06-15',
                    'status' => 'corrupt_val'
                ]
            ]
        ];

        $mockService = $this->createMock(AttendanceResolutionService::class);
        $mockService->method('resolveForEmployee')->willReturn($mockResolution);
        $this->app->instance(AttendanceResolutionService::class, $mockService);

        // Seed at least one valid attendance record so that "No attendance data" exclusion does not trigger
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-06-10',
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $result = $this->eligibilityService->checkEmployee($this->employee, $this->client, $monthStart, $monthEnd);
        $this->assertContains(
            "Unexpected attendance status 'corrupt_val' on 2026-06-15 — data integrity issue, verify manually",
            $result['warnings']
        );
    }

    /**
     * Test 13: Mid-month hire (DOJ = June 16) only counts days from June 16 onward.
     * June 16-30 = 15 calendar days (11 weekdays + 4 weekends).
     * All weekdays present → paid_days = 15, lop_days = 0.
     * Pre-DOJ days (June 1-15) are completely excluded.
     */
    public function test_mid_month_hire_attendance_resolution_bounded_by_doj()
    {
        // Set DOJ to June 16
        $this->employee->update(['date_of_joining' => '2026-06-16']);

        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        // Seed attendance records for weekdays from June 16 onward
        $start = Carbon::parse('2026-06-16');
        $end = Carbon::parse('2026-06-30');
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $result = $this->attendanceService->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        // June 16-30: 11 weekdays (present) + 4 weekends (paid) = 15 paid days
        $this->assertEquals(15.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);
        $this->assertEmpty($result['incomplete_punches']);
        $this->assertEmpty($result['unexpected_records']);
    }

    /**
     * Test 14: Full-month employee (DOJ well before the target month) is byte-for-byte unchanged.
     * DOJ = 2024-01-01, target month = June 2026 → effectiveStart = June 1 (unchanged).
     */
    public function test_full_month_employee_resolution_unchanged_after_doj_fix()
    {
        // DOJ is already 2024-01-01 (well before June 2026)
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        $start = Carbon::parse($monthStart);
        $end = Carbon::parse($monthEnd);

        // Seed full month weekdays as present
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $this->employee->id,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $result = $this->attendanceService->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        // Full month: 22 weekdays (present) + 8 weekends (paid) = 30 paid days, 0 LOP
        $this->assertEquals(30.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);
    }

    /**
     * Test 15: Employee with DOJ after the target month returns zero paid/LOP days.
     */
    public function test_doj_after_target_month_returns_zeroes()
    {
        $this->employee->update(['date_of_joining' => '2026-08-01']);

        $result = $this->attendanceService->resolveForEmployee($this->employee, '2026-06-01', '2026-06-30');

        $this->assertEquals(0.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);
    }
}
