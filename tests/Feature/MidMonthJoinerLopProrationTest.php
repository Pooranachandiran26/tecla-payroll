<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\AttendanceRecord;
use App\Services\MonthlyPayrollCalculator;

class MidMonthJoinerLopProrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test 1: TEC-001 Mid-month joiner (joined July 30) with 1 Present + 1 LOP
     * Master Gross = ₹62,000. Expected Gross = ₹1,806.46 (1 / 31 of each component).
     */
    public function test_1_tec001_mid_month_joiner_with_lop_prorated_to_2000_gross()
    {
        $client = Client::factory()->create(['lop_basis_days' => 30]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'TEC-001',
            'date_of_joining' => '2026-07-30',
            'attendance_tracking_start_date' => '2026-07-30',
            'basic_pay' => 50000,
            'hra' => 2000,
            'conveyance' => 2000,
            'da' => 2000,
            'medical_allowance' => 2000,
            'special_allowance' => 2000,
            'other_additions' => 2000,
            'gross_monthly_salary' => 62000,
            'lop_basis_days' => 30,
        ]);

        // Attendance: July 30 = Present, July 31 = Absent
        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-30',
            'status' => 'present',
            'source' => 'live_punch',
        ]);
        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-31',
            'status' => 'absent',
            'source' => 'live_punch',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(1.0, $result['paid_days']);
        $this->assertEquals(1.0, $result['lop_days']);
        
        // 1 / 31 component sum of all 7 components = ₹2,000.02
        $this->assertEquals(2000.02, $result['gross_total']);
        $this->assertLessThan(50000, $result['gross_total']); // Must NOT be ₹59,933.31!
    }

    /**
     * Test 2: TEC-002 Mid-month joiner (joined July 30) with 2 Present + 0 LOP
     * Master Gross = ₹76,000. Expected Gross = ₹4,903.23 (2 / 31 * ₹76,000).
     */
    public function test_2_tec002_mid_month_joiner_without_lop_prorated_to_4903_23_gross()
    {
        $client = Client::factory()->create(['lop_basis_days' => 30]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'TEC-002',
            'date_of_joining' => '2026-07-30',
            'attendance_tracking_start_date' => '2026-07-30',
            'basic_pay' => 60000,
            'hra' => 10000,
            'special_allowance' => 6000,
            'gross_monthly_salary' => 76000,
            'lop_basis_days' => 30,
        ]);

        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-30',
            'status' => 'present',
            'source' => 'live_punch',
        ]);
        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-31',
            'status' => 'present',
            'source' => 'live_punch',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(2.0, $result['paid_days']);
        $this->assertEquals(0.0, $result['lop_days']);
        // 2 / 31 * ₹76,000 = ₹4,903.23
        $this->assertEquals(4903.23, $result['gross_total']);
    }

    /**
     * Test 3: Normal full-month employee (joined July 1) with 1 LOP day
     * Full Month Gross = ₹62,000. Expected Gross = ₹59,933.32 (62,000 - 1/30 * 62,000).
     */
    public function test_3_normal_full_month_employee_with_lop_unaffected()
    {
        $client = Client::factory()->create(['lop_basis_days' => 30]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-FULL',
            'date_of_joining' => '2026-01-01',
            'attendance_tracking_start_date' => '2026-01-01',
            'basic_pay' => 50000,
            'hra' => 8000,
            'special_allowance' => 2000,
            'other_additions' => 2000,
            'gross_monthly_salary' => 62000,
            'lop_basis_days' => 30,
        ]);

        // July 2026: 30 days present, 1 day absent
        for ($day = 1; $day <= 30; $day++) {
            $dateStr = sprintf('2026-07-%02d', $day);
            AttendanceRecord::create([
                'employee_id' => $employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
            ]);
        }
        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-31',
            'status' => 'absent',
            'source' => 'live_punch',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(1.0, $result['lop_days']);
        // Full Month Gross minus 1 LOP day: ₹62,000 - ₹2,066.68 = ₹59,933.32
        $this->assertEquals(59933.32, $result['gross_total']);
    }

    /**
     * Test 4: Mid-month joiner (joined July 15) with 15 Present + 2 LOP
     * Master Gross = ₹62,000. Paid days = 15. Expected Gross = 15 / 31 * ₹62,000 = ₹30,000.00.
     */
    public function test_4_mid_month_joiner_15th_of_month_with_lop_prorated_correctly()
    {
        $client = Client::factory()->create(['lop_basis_days' => 30]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-MID15',
            'date_of_joining' => '2026-07-15',
            'attendance_tracking_start_date' => '2026-07-15',
            'basic_pay' => 50000,
            'hra' => 8000,
            'special_allowance' => 2000,
            'other_additions' => 2000,
            'gross_monthly_salary' => 62000,
            'lop_basis_days' => 30,
        ]);

        // 15 days present (July 15 to July 29), 2 days absent (July 30 & 31)
        for ($day = 15; $day <= 29; $day++) {
            $dateStr = sprintf('2026-07-%02d', $day);
            AttendanceRecord::create([
                'employee_id' => $employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
            ]);
        }
        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-30',
            'status' => 'absent',
            'source' => 'live_punch',
        ]);
        AttendanceRecord::create([
            'employee_id' => $employee->id,
            'attendance_date' => '2026-07-31',
            'status' => 'absent',
            'source' => 'live_punch',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(15.0, $result['paid_days']);
        $this->assertEquals(2.0, $result['lop_days']);
        // 15 / 31 * ₹62,000 component sum = ₹30,000.00
        $this->assertEquals(30000.00, $result['gross_total']);
    }

    /**
     * Test 5: Canonical PF Check (TEC-088) — Employer PF remains exactly ₹1,950.00
     */
    public function test_5_tec088_canonical_pf_unaffected()
    {
        $client = Client::factory()->create(['lop_basis_days' => 30]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'TEC-088',
            'date_of_joining' => '2025-01-01',
            'basic_pay' => 50000,
            'hra' => 10000,
            'pf_applicable' => true,
            'employer_pf_wage_basis' => 'ceiling',
            'lop_basis_days' => 30,
        ]);

        // Full month present
        for ($day = 1; $day <= 31; $day++) {
            $dateStr = sprintf('2026-07-%02d', $day);
            AttendanceRecord::create([
                'employee_id' => $employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
            ]);
        }

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        // 13% of ₹15,000 cap = ₹1,950.00
        $this->assertEquals(1950.00, $result['employer_pf']);
    }
}
