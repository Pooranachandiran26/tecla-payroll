<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeAttendanceOverride;
use App\Models\Holiday;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AttendanceHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected AttendanceResolutionService $service;
    protected Client $client;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();
        User::factory()->create(['role' => 'admin']);
        $this->service = app(AttendanceResolutionService::class);

        $this->client = Client::factory()->create([
            'weekly_off_pattern' => 'sat,sun',
        ]);
        ClientBranch::factory()->create(['client_id' => $this->client->id]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'date_of_joining' => '2024-01-01',
            'weekly_off_pattern' => null,
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: Approved override — work_day on a weekly_off day
    //
    // Saturday July 4, 2026 is a weekly off (sat,sun pattern).
    // An approved override marks it as 'work_day'.
    // With NO attendance record → the employee was expected to work but
    // didn't punch → this date becomes LOP.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_1_approved_override_work_day_on_weekly_off_without_record_is_lop()
    {
        // July 4, 2026 is a Saturday
        $this->assertTrue(Carbon::parse('2026-07-04')->isSaturday());

        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-07-04',
            'attendance_day_type' => 'work_day',
            'reason' => 'Working Saturday for day swap',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        // Seed all OTHER weekdays in July 1-7 as present (Tue-Fri only — Mon Jul 6 doesn't exist, it's Wed-Fri Jul 1-3)
        // July 1 (Wed), 2 (Thu), 3 (Fri) = weekdays with attendance
        // July 4 (Sat) = override work_day, NO attendance record
        // July 5 (Sun) = weekly off, paid
        // July 6 (Mon), 7 (Tue) = weekdays with attendance
        foreach (['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-06', '2026-07-07'] as $dateStr) {
            DB::table('attendance_records')->insert([
                'employee_id' => $this->employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $result = $this->service->resolveForEmployee($this->employee, '2026-07-01', '2026-07-07');

        // 5 present weekdays + 1 Sunday paid = 6 paid days
        // 1 Saturday (override work_day, no record) = 1 LOP day
        $this->assertEquals(6.0, $result['paid_days']);
        $this->assertEquals(1.0, $result['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: Approved override — weekly_off on a normal work day
    //
    // Tuesday July 7, 2026 is a normal work day.
    // An approved override marks it as 'weekly_off' (the swap's other half).
    // With NO attendance record → paid (employee is excused).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_2_approved_override_weekly_off_on_work_day_is_paid()
    {
        // July 7, 2026 is a Tuesday
        $this->assertTrue(Carbon::parse('2026-07-07')->isTuesday());

        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-07-07',
            'attendance_day_type' => 'weekly_off',
            'reason' => 'Day off in exchange for working Saturday',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        // Seed other weekdays as present: Jul 6 (Mon), Jul 8 (Wed), Jul 9 (Thu), Jul 10 (Fri)
        foreach (['2026-07-06', '2026-07-08', '2026-07-09', '2026-07-10'] as $dateStr) {
            DB::table('attendance_records')->insert([
                'employee_id' => $this->employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $result = $this->service->resolveForEmployee($this->employee, '2026-07-06', '2026-07-12');

        // Jul 6 (Mon present) + Jul 7 (Tue override weekly_off, PAID) + Jul 8 (Wed present)
        // + Jul 9 (Thu present) + Jul 10 (Fri present) + Jul 11 (Sat weekly_off) + Jul 12 (Sun weekly_off)
        // = 7 paid days, 0 LOP
        $this->assertEquals(7.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: Client holiday → paid for all employees, no attendance needed
    //
    // August 14, 2026 is a Friday (regular work day).
    // Client has it configured as a holiday.
    // No attendance record → PAID (not LOP).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_3_client_holiday_is_paid_without_attendance_record()
    {
        // Aug 14, 2026 is a Friday
        $this->assertTrue(Carbon::parse('2026-08-14')->isFriday());

        Holiday::create([
            'client_id' => $this->client->id,
            'holiday_date' => '2026-08-14',
            'name' => 'Independence Day Eve',
            'is_optional' => false,
        ]);

        // Seed weekdays Aug 10-13 as present (Mon-Thu)
        foreach (['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13'] as $dateStr) {
            DB::table('attendance_records')->insert([
                'employee_id' => $this->employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $result = $this->service->resolveForEmployee($this->employee, '2026-08-09', '2026-08-15');

        // Aug 9 (Sun paid) + Aug 10-13 (Mon-Thu present) + Aug 14 (Fri holiday PAID) + Aug 15 (Sat paid)
        // = 7 paid, 0 LOP
        $this->assertEquals(7.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);

        // Also verify a SECOND employee of the same client gets the same holiday benefit
        $employee2 = Employee::factory()->create([
            'client_id' => $this->client->id,
            'date_of_joining' => '2024-01-01',
            'weekly_off_pattern' => null,
            'pan_number' => 'BBBBB2222B',
            'aadhaar_number' => '222222222222',
            'bank_account_number' => '222222222222',
        ]);

        // Employee 2 has no attendance records at all for this week
        $result2 = $this->service->resolveForEmployee($employee2, '2026-08-09', '2026-08-15');

        // Aug 14 (Fri) should still be paid (holiday), not LOP
        // Paid: Aug 9 (Sun) + Aug 14 (Fri holiday) + Aug 15 (Sat) = 3 paid
        // LOP: Aug 10, 11, 12, 13 (Mon-Thu no records, work days) = 4 LOP
        $this->assertEquals(3.0, $result2['paid_days']);
        $this->assertEquals(4.0, $result2['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 4: Employee weekly_off_pattern overrides client's default
    //
    // Client has 'sat,sun'. Employee has 'fri,sat'.
    // Friday → paid (employee's off day, no record needed).
    // Sunday → LOP (NOT in employee's pattern, no record = LOP).
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_4_employee_weekly_off_pattern_overrides_client_default()
    {
        $this->employee->update(['weekly_off_pattern' => 'fri,sat']);

        // Jul 6-12, 2026: Mon-Sun
        // Employee pattern: fri,sat off. Mon-Thu are work days. Sun is a work day.
        // Seed Mon-Thu as present
        foreach (['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09'] as $dateStr) {
            DB::table('attendance_records')->insert([
                'employee_id' => $this->employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // No records for Fri Jul 10, Sat Jul 11, Sun Jul 12
        $result = $this->service->resolveForEmployee($this->employee, '2026-07-06', '2026-07-12');

        // Mon-Thu present (4 paid) + Fri (employee off, PAID) + Sat (employee off, PAID) = 6 paid
        // Sun (NOT in employee's pattern, no record) = 1 LOP
        $this->assertEquals(6.0, $result['paid_days']);
        $this->assertEquals(1.0, $result['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 5: BYTE-IDENTICAL REGRESSION
    //
    // Reproduce 3 exact scenarios from existing tests:
    //   A) Full-month employee (DOJ 2024-01-01, June 2026, all weekdays present)
    //      → paid_days=30.0, lop_days=0.0
    //   B) Mid-month hire (DOJ 2026-06-16, Jun 16-30 weekdays present)
    //      → paid_days=15.0, lop_days=0.0
    //   C) ATSD-bounded employee (DOJ 2023-01-01, ATSD 2026-07-01, cycle Jun 26-Jul 25, no records)
    //      → paid_days+lop_days=25.0
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_5_byte_identical_regression_full_month()
    {
        // Employee A: full month, DOJ well before target month
        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

        $start = Carbon::parse($monthStart);
        $end = Carbon::parse($monthEnd);

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

        $result = $this->service->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        // MUST match existing test: 22 weekday present + 8 weekend paid = 30 paid, 0 LOP
        $this->assertSame(30.0, $result['paid_days']);
        $this->assertSame(0.0, $result['lop_days']);
        $this->assertEquals('live_punch', $result['attendance_source']);
    }

    #[Test]
    public function test_5b_byte_identical_regression_mid_month_hire()
    {
        // Employee B: DOJ June 16
        $this->employee->update(['date_of_joining' => '2026-06-16']);

        $monthStart = '2026-06-01';
        $monthEnd = '2026-06-30';

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

        $result = $this->service->resolveForEmployee($this->employee, $monthStart, $monthEnd);

        // MUST match existing test: Jun 16-30 = 11 weekdays present + 4 weekends paid = 15 paid, 0 LOP
        $this->assertSame(15.0, $result['paid_days']);
        $this->assertSame(0.0, $result['lop_days']);
        $this->assertEmpty($result['incomplete_punches']);
        $this->assertEmpty($result['unexpected_records']);
    }

    #[Test]
    public function test_5c_byte_identical_regression_atsd_bounded()
    {
        // Employee C: DOJ 2023-01-01, ATSD 2026-07-01, no records
        $this->employee->update([
            'date_of_joining' => '2023-01-01',
            'attendance_tracking_start_date' => '2026-07-01',
        ]);

        // Custom cycle: June 26 to July 25
        $result = $this->service->resolveForEmployee($this->employee, '2026-06-26', '2026-07-25');

        // MUST match existing test: resolved window = July 1-25 only (25 days total)
        $totalResolvedDays = $result['paid_days'] + $result['lop_days'];
        $this->assertSame(25.0, $totalResolvedDays);

        // Verify the breakdown is correct for sat,sun pattern:
        // July 1 (Wed) to July 25 (Sat)
        // Weekends in range: Jul 4(Sat), 5(Sun), 11(Sat), 12(Sun), 18(Sat), 19(Sun), 25(Sat) = 7 weekend days paid
        // Weekdays: 25 - 7 = 18 weekday LOP (no attendance records)
        $this->assertSame(7.0, $result['paid_days']);
        $this->assertSame(18.0, $result['lop_days']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 6: "Reality beats plan" — real attendance record wins over override
    //
    // Employee has an approved weekly_off override for Tuesday Jul 7.
    // But ALSO has a real attendance_records row with status='absent'.
    // The REAL record must win → LOP, not paid.
    // ═══════════════════════════════════════════════════════════════════════
    #[Test]
    public function test_6_real_attendance_record_beats_override()
    {
        // Tuesday July 7, 2026
        $this->assertTrue(Carbon::parse('2026-07-07')->isTuesday());

        // Approved weekly_off override (would normally make this day paid)
        EmployeeAttendanceOverride::create([
            'employee_id' => $this->employee->id,
            'override_date' => '2026-07-07',
            'attendance_day_type' => 'weekly_off',
            'reason' => 'Day swap — Tuesday off',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        // But there's ALSO a real attendance record with status='absent'
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-07-07',
            'status' => 'absent',
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Seed Jul 6 (Mon) as present
        DB::table('attendance_records')->insert([
            'employee_id' => $this->employee->id,
            'attendance_date' => '2026-07-06',
            'status' => 'present',
            'source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $result = $this->service->resolveForEmployee($this->employee, '2026-07-06', '2026-07-07');

        // Jul 6 (Mon present) = 1 paid
        // Jul 7 (Tue: real 'absent' record exists → override is IGNORED → LOP)
        $this->assertEquals(1.0, $result['paid_days']);
        $this->assertEquals(1.0, $result['lop_days']);
    }
}
