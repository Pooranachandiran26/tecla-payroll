<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\SalaryRevision;
use App\Services\MonthlyPayrollCalculator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MonthlyPayrollCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $branch;
    protected $employee;
    protected $payrollRun;
    protected $calculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create([
            'status' => 'active',
            'pt_state' => 'Maharashtra',
        ]);
        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id, 
            'branch_name' => 'Mumbai',
            'state' => 'Maharashtra'
        ]);
        
        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'full_name' => 'Calculation Test Employee',
            'personal_email' => 'calc.test@example.com',
            'phone_number' => '9988776654',
            'date_of_birth' => '1992-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Architect',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '456 St',
            'bank_account_number' => '1234567891',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Calculation Test Employee',
            'pan_number' => 'ABCDE1234G',
            'employee_code' => 'TEC-888',
            'status' => 'active',
            'basic_pay' => 10000,
            'hra' => 5000,
            'conveyance' => 1000,
            'da' => 1000,
            'medical_allowance' => 1000,
            'special_allowance' => 1000,
            'other_additions' => 1000,
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
            'uan_mode' => 'new',
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_applicable' => true,
            'lwf_applicable' => true,
        ]);

        $this->payrollRun = DB::table('payroll_runs')->insertGetId([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->payrollRun = DB::table('payroll_runs')->where('id', $this->payrollRun)->first();

        // Seed LWF Slabs
        DB::table('lwf_slabs')->insertOrIgnore([
            'state' => 'Maharashtra',
            'employee_contribution' => 25.00,
            'employer_contribution' => 75.00,
            'frequency' => 'half_yearly',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Seed PT Slabs
        DB::table('pt_slabs')->insertOrIgnore([
            'state' => 'Maharashtra',
            'min_salary' => 10001,
            'max_salary' => null,
            'deduction_amount' => 200.00,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->calculator = app(MonthlyPayrollCalculator::class);
    }

    /**
     * Test 1: Mid-month salary revision correctly computes old/new split components.
     */
    public function test_mid_month_salary_revision_split()
    {
        // 15 days of old components (basic=10000, HRA=5000, others=1000)
        // 15 days of new components (basic=20000, HRA=10000, others=2000)
        SalaryRevision::create([
            'employee_id' => $this->employee->id,
            'effective_date' => '2026-06-16',
            'status' => 'approved',
            
            'old_basic_pay' => 10000, 'new_basic_pay' => 20000,
            'old_hra' => 5000, 'new_hra' => 10000,
            'old_conveyance' => 1000, 'new_conveyance' => 2000,
            'old_da' => 1000, 'new_da' => 2000,
            'old_medical_allowance' => 1000, 'new_medical_allowance' => 2000,
            'old_special_allowance' => 1000, 'new_special_allowance' => 2000,
            'old_other_additions' => 1000, 'new_other_additions' => 2000,
            'old_net_take_home' => 18000, 'new_net_take_home' => 36000,
            'old_ctc' => 21000, 'new_ctc' => 42000,
        ]);

        // Full month (30 paid days)
        $start = Carbon::parse('2026-06-01');
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

        $result = $this->calculator->calculateForEmployee($this->employee, $this->payrollRun);

        // Expected prorated Basic: 10000 * (15/30) + 20000 * (15/30) = 5000 + 10000 = 15000
        $this->assertEquals(15000.00, $result['basic_pay']);
        // Expected prorated HRA: 5000 * (15/30) + 10000 * (15/30) = 2500 + 5000 = 7500
        $this->assertEquals(7500.00, $result['hra']);
        $this->assertTrue($result['salary_revision_applied']);
    }

    /**
     * Test 2: Reduced paid days (LOP) computes smaller outputs, does NOT alter employees table.
     */
    public function test_reduced_paid_days_lop()
    {
        // 20 paid days, 10 LOP days
        // basic_pay structural = 10000. Under 30 basis days, 20/30 paid days = 6666.67
        $start = Carbon::parse('2026-06-01');
        $end = Carbon::parse('2026-06-30');

        $dayCount = 0;
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                $dayCount++;
                $status = ($dayCount <= 10) ? 'absent' : 'present';
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

        // Capture original structural values on employees table
        $originalBasic = $this->employee->basic_pay;

        $result = $this->calculator->calculateForEmployee($this->employee, $this->payrollRun);

        // Verify pro-rated values are smaller
        $this->assertEquals(6666.67, $result['basic_pay']); // 10000 * 20/30
        
        // Verify employees table is completely untouched
        $this->employee->refresh();
        $this->assertEquals($originalBasic, $this->employee->basic_pay);
    }

    /**
     * Test 3: 50% cap correctly defers excess loan EMI.
     */
    public function test_fifty_percent_deduction_cap()
    {
        // Full attendance, no revision. Structural components: basic=10000, hra=5000, others=1000 * 5 = 5000. Total gross = 20000.
        // Cap limit = 10000 (50%).
        // Deductions:
        // - PF: min(basic, 15000) * 12% = 10000 * 12% = 1200
        // - ESI: 20000 * 0.75% = 150
        // - PT: 200
        // - LWF: 25
        // - TDS: 1000 (via override)
        // - Loan: 8000 (via override)
        // Total deductions = 1200 + 150 + 200 + 25 + 1000 + 8000 = 10575 (exceeds cap of 10000 by 575).
        // Actual loan allowed: 8000 - 575 = 7425. Deferred loan: 575.

        $start = Carbon::parse('2026-06-01');
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

        $result = $this->calculator->calculateForEmployee($this->employee, $this->payrollRun, [
            'tds_deduction' => 1000.00,
            'loan_emi_deduction' => 8000.00,
        ]);

        $this->assertEquals(7425.00, $result['loan_emi_deduction']);
        $this->assertEquals(575.00, $result['deferred_loan_amount']);
        $this->assertEquals(10000.00, $result['net_pay']); // Gross 20000 - Deductions 10000 = 10000 net pay
    }

    /**
     * Helper to seed full month present records for an employee.
     */
    private function seedAttendanceForMonth($employeeId, $monthStr)
    {
        $start = Carbon::parse($monthStr)->startOfMonth();
        $end = Carbon::parse($monthStr)->endOfMonth();
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $employeeId,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Test 4: Employee crosses ESI threshold in March (Oct-Mar period) -> ESI deducted in March, stops in April.
     */
    public function test_esi_transition_period_oct_mar()
    {
        // Set up high salary so they cross the threshold
        $this->employee->update([
            'basic_pay' => 25000, // Gross 35000 (> 21000)
            'hra' => 10000,
            'esi_threshold_crossed_month' => null
        ]);

        $this->seedAttendanceForMonth($this->employee->id, '2026-03-01');

        $payrollRunMarch = (object)[
            'id' => $this->payrollRun->id,
            'payroll_month' => '2026-03-01'
        ];

        // 1. Run March (crossing month)
        $resultMarch = $this->calculator->calculateForEmployee($this->employee, $payrollRunMarch);
        
        // ESI is active because they crossed mid-period and March is the crossing month
        $this->assertGreaterThan(0, $resultMarch['employee_esi']);
        $this->assertEquals('2026-03-01', $this->employee->fresh()->esi_threshold_crossed_month);

        // Clear attendance for fresh run
        DB::table('attendance_records')->truncate();

        // 2. Run April (new period Apr-Sep, starts fresh)
        $this->seedAttendanceForMonth($this->employee->id, '2026-04-01');
        $payrollRunApril = (object)[
            'id' => $this->payrollRun->id,
            'payroll_month' => '2026-04-01'
        ];
        
        $resultApril = $this->calculator->calculateForEmployee($this->employee, $payrollRunApril);

        // ESI stops in April because April starts a new period and gross is > 21000
        $this->assertEquals(0, $resultApril['employee_esi']);
    }

    /**
     * Test 5: Employee crosses in June (Apr-Sep period) -> ESI continues through September, stops in October.
     */
    public function test_esi_transition_period_apr_sep()
    {
        $this->employee->update([
            'basic_pay' => 25000,
            'hra' => 10000,
            'esi_threshold_crossed_month' => null
        ]);

        $this->seedAttendanceForMonth($this->employee->id, '2026-06-01');

        // 1. Crosses in June
        $payrollRunJune = (object)[
            'id' => $this->payrollRun->id,
            'payroll_month' => '2026-06-01'
        ];
        $resultJune = $this->calculator->calculateForEmployee($this->employee, $payrollRunJune);
        $this->assertGreaterThan(0, $resultJune['employee_esi']);
        $this->assertEquals('2026-06-01', $this->employee->fresh()->esi_threshold_crossed_month);

        // Clear attendance and seed September
        DB::table('attendance_records')->truncate();
        $this->seedAttendanceForMonth($this->employee->id, '2026-09-01');

        // 2. Check September (still in period Apr-Sep)
        $payrollRunSept = (object)[
            'id' => $this->payrollRun->id,
            'payroll_month' => '2026-09-01'
        ];
        $resultSept = $this->calculator->calculateForEmployee($this->employee, $payrollRunSept);
        $this->assertGreaterThan(0, $resultSept['employee_esi']);

        // Clear attendance and seed October
        DB::table('attendance_records')->truncate();
        $this->seedAttendanceForMonth($this->employee->id, '2026-10-01');

        // 3. Check October (new period starts, ESI stops)
        $payrollRunOct = (object)[
            'id' => $this->payrollRun->id,
            'payroll_month' => '2026-10-01'
        ];
        $resultOct = $this->calculator->calculateForEmployee($this->employee, $payrollRunOct);
        $this->assertEquals(0, $resultOct['employee_esi']);
    }

    /**
     * Test 6: PT slab missing flags exclusion_reason and registers PT = 0.
     */
    public function test_pt_slab_missing_warning()
    {
        // Set PT state to a state with no slabs (e.g. Gujarat)
        $this->client->update(['pt_state' => 'Gujarat']);

        $result = $this->calculator->calculateForEmployee($this->employee, $this->payrollRun);

        $this->assertEquals(0.00, $result['professional_tax']);
        $this->assertGreaterThan(0.00, $result['net_pay']);
        
        // Assert the warning is saved in the database line item
        $runItem = DB::table('payroll_run_items')->where('id', $result['id'])->first();
        $this->assertEquals(0, $runItem->is_excluded);
        $this->assertNull($runItem->exclusion_reason);
        $this->assertEquals('PT slab missing for state: Gujarat', $runItem->warning_notes);
    }

    /**
     * Test 7: Combined Salary Revision and LOP scaling in the same month.
     */
    public function test_salary_revision_and_lop_days_combined()
    {
        // 1. Setup a salary revision starting June 16th (15 days before, 15 days after in a 30-day month)
        // basic_pay goes from 10,000 to 20,000. HRA from 5,000 to 10,000. Others go from 1,000 to 2,000.
        DB::table('salary_revisions')->insert([
            'employee_id' => $this->employee->id,
            'effective_date' => '2026-06-16',
            'old_basic_pay' => 10000,
            'old_hra' => 5000,
            'old_conveyance' => 1000,
            'old_da' => 1000,
            'old_medical_allowance' => 1000,
            'old_special_allowance' => 1000,
            'old_other_additions' => 1000,
            'old_net_take_home' => 18000,
            'old_ctc' => 20000,
            'new_basic_pay' => 20000,
            'new_hra' => 10000,
            'new_conveyance' => 2000,
            'new_da' => 2000,
            'new_medical_allowance' => 2000,
            'new_special_allowance' => 2000,
            'new_other_additions' => 2000,
            'new_net_take_home' => 36000,
            'new_ctc' => 40000,
            'status' => 'approved',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Setup 5 LOP days (out of 30 calendar days).
        // 25 paid days.
        $start = Carbon::parse('2026-06-01');
        $end = Carbon::parse('2026-06-30');
        
        $lopCount = 0;
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                // Mark 5 weekdays as 'absent' to trigger LOP
                $status = ($lopCount < 5) ? 'absent' : 'present';
                if ($status === 'absent') {
                    $lopCount++;
                }

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

        $result = $this->calculator->calculateForEmployee($this->employee, $this->payrollRun);

        // Verification calculations:
        // Prorated structural basic: (10,000 * 15/30) + (20,000 * 15/30) = 15,000.00
        // Prorated structural HRA: (5,000 * 15/30) + (10,000 * 15/30) = 7,500.00
        // Prorated structural others: (1,000 * 15/30) + (2,000 * 15/30) = 1,500.00 each
        //
        // Applying 5 LOP days scaling (25 / 30):
        // Scaled basic: 15,000 * (25 / 30) = 12,500.00
        // Scaled HRA: 7,500 * (25 / 30) = 6,250.00
        // Scaled others: 1,500 * (25 / 30) = 1,250.00 each
        //
        // LOP deduction (pre-LOP gross 30,000 - post-LOP gross 25,000) = 5,000.00

        $this->assertEquals(12500.00, $result['basic_pay']);
        $this->assertEquals(6250.00, $result['hra']);
        $this->assertEquals(1250.00, $result['conveyance']);
        $this->assertEquals(1250.00, $result['da']);
        $this->assertEquals(1250.00, $result['medical_allowance']);
        $this->assertEquals(1250.00, $result['special_allowance']);
        $this->assertEquals(1250.00, $result['other_additions']);
        $this->assertEquals(5000.00, $result['lop_deduction']);
    }

    /**
     * Test 8: Sourced Maharashtra LWF deduction calculation works correctly.
     */
    public function test_maharashtra_lwf_deduction()
    {
        // Set basic pay to 15000 and HRA to 5000, other components to 0 to yield Gross = 20,000 <= 21,000 ESI ceiling
        $this->employee->update([
            'basic_pay' => 15000,
            'hra' => 5000,
            'da' => 0,
            'conveyance' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);

        // 1. Seed attendance for June 2026 (LWF half-yearly month)
        $this->seedAttendanceForMonth($this->employee->id, '2026-06-01');

        $result = $this->calculator->calculateForEmployee($this->employee, $this->payrollRun);

        // Maharashtra has employee_contribution = 25, employer_contribution = 75 in June
        $this->assertEquals(25.00, $result['lwf_deduction']);
        
        // Assert the database run item is saved correctly
        $runItem = DB::table('payroll_run_items')->where('id', $result['id'])->first();
        $this->assertEquals(25.00, $runItem->lwf_deduction);

        // Verify total employer statutory cost includes the employer_contribution (75.00)
        // PF (1950.00) + ESI (650.00 since gross = 20000 <= 21000 ESI ceiling) + LWF (75.00) = 2675.00.
        $this->assertEquals(1950.00, $result['employer_pf']);
        $this->assertEquals(650.00, $result['employer_esi']);
        $this->assertEquals(2675.00, $result['employer_statutory_cost']);
    }
}
