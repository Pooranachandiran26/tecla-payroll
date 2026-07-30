<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\MonthlyPayrollCalculator;
use App\Services\FullAndFinalCalculationService;
use Database\Seeders\PtSlabSeeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PtSlabCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed PT slabs
        $this->seed(PtSlabSeeder::class);
    }

    private function seedFullAttendance(Employee $employee, string $month = '2026-07')
    {
        $start = Carbon::parse($month . '-01');
        $daysInMonth = $start->daysInMonth;

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = $start->copy()->day($d)->toDateString();
            DB::table('attendance_records')->insert([
                'employee_id' => $employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function createPayrollRunItem(array $data)
    {
        $defaults = [
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 5000,
            'hra' => 4000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 9000,
            'employee_pf' => 0,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 9000,
            'employer_pf' => 0,
            'employer_esi' => 0,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('payroll_run_items')->insert(array_merge($defaults, $data));
    }

    /** @test */
    public function test_maharashtra_male_gross_20000_gets_200_pt()
    {
        $client = Client::factory()->create(['registered_state' => 'Maharashtra', 'pt_state' => 'Maharashtra']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Maharashtra']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'gender' => 'male',
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 10000,
            'hra' => 5000,
            'special_allowance' => 5000,
            'gross_monthly_salary' => 20000,
            'pt_applicable' => true,
        ]); // Gross = 20,000

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(20000.00, $result['gross_total']);
        // Gross 20,000 falls in > 10,000 bracket (deduction = 200)
        $this->assertEquals(200.00, $result['professional_tax']);
    }

    /** @test */
    public function test_maharashtra_male_gross_9000_gets_175_pt()
    {
        $client = Client::factory()->create(['registered_state' => 'Maharashtra', 'pt_state' => 'Maharashtra']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Maharashtra']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'gender' => 'male',
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 5000,
            'hra' => 4000,
            'gross_monthly_salary' => 9000,
            'pt_applicable' => true,
        ]); // Gross = 9,000

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(9000.00, $result['gross_total']);
        // Gross 9,000 falls in 7,501 - 10,000 bracket (deduction = 175)
        $this->assertEquals(175.00, $result['professional_tax']);
    }

    /** @test */
    public function test_maharashtra_female_gross_20000_is_exempt_0_pt()
    {
        $client = Client::factory()->create(['registered_state' => 'Maharashtra', 'pt_state' => 'Maharashtra']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Maharashtra']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'gender' => 'female',
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 10000,
            'hra' => 5000,
            'special_allowance' => 5000,
            'gross_monthly_salary' => 20000,
            'pt_applicable' => true,
        ]); // Gross = 20,000

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(20000.00, $result['gross_total']);
        // Female employee in MH with Gross <= 25,000 is EXEMPT per 2023 amendment (PT = 0)
        $this->assertEquals(0.00, $result['professional_tax']);
    }

    /** @test */
    public function test_karnataka_gross_25000_gets_200_pt()
    {
        $client = Client::factory()->create(['registered_state' => 'Karnataka', 'pt_state' => 'Karnataka']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Karnataka']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 15000,
            'hra' => 10000,
            'gross_monthly_salary' => 25000,
            'pt_applicable' => true,
        ]); // Gross = 25,000

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(25000.00, $result['gross_total']);
        $this->assertEquals(200.00, $result['professional_tax']);
    }

    /** @test */
    public function test_tamil_nadu_gross_9000_gets_155_monthly_pt()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 5000,
            'hra' => 4000,
            'gross_monthly_salary' => 9000,
            'pt_applicable' => true,
        ]); // Gross = 9,000 (falls in 7,501-10,000 monthly bracket / 930 half-yearly)

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(9000.00, $result['gross_total']);
        // Monthly deduction rate = 930 / 6 = 155.00
        $this->assertEquals(155.00, $result['professional_tax']);
    }

    /** @test */
    public function test_tamil_nadu_exit_shortfall_recovery_partially_paid()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 5000,
            'hra' => 4000,
            'gross_monthly_salary' => 9000,
            'pt_applicable' => true,
        ]);

        // Simulate 2 months in active Cycle 1 (Apr 2026 & May 2026) paid at 155/mo = 310 total
        $run1 = PayrollRun::create(['client_id' => $client->id, 'payroll_month' => '2026-04-01', 'status' => 'locked']);
        $this->createPayrollRunItem(['payroll_run_id' => $run1->id, 'employee_id' => $employee->id, 'professional_tax' => 155.00, 'net_pay' => 8845]);

        $run2 = PayrollRun::create(['client_id' => $client->id, 'payroll_month' => '2026-05-01', 'status' => 'locked']);
        $this->createPayrollRunItem(['payroll_run_id' => $run2->id, 'employee_id' => $employee->id, 'professional_tax' => 155.00, 'net_pay' => 8845]);

        // Employee exits on May 31, 2026
        $fnfService = new FullAndFinalCalculationService();
        $preview = $fnfService->calculatePreview($employee, [
            'last_working_day' => '2026-05-31',
            'pending_salary_amount' => 9000,
        ]);

        // Target liability = 930. Paid = 310. Shortfall recovered at exit = 620.00
        $this->assertEquals(620.00, $preview['pt_shortfall_recovery']);
    }

    /** @test */
    public function test_tamil_nadu_exit_shortfall_recovery_fully_missed()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 5000,
            'hra' => 4000,
            'gross_monthly_salary' => 9000,
            'pt_applicable' => true,
        ]);

        // Simulate 2 months processed at 0.00 PT due to historical empty table bug
        $run1 = PayrollRun::create(['client_id' => $client->id, 'payroll_month' => '2026-04-01', 'status' => 'locked']);
        $this->createPayrollRunItem(['payroll_run_id' => $run1->id, 'employee_id' => $employee->id, 'professional_tax' => 0.00, 'net_pay' => 9000]);

        $run2 = PayrollRun::create(['client_id' => $client->id, 'payroll_month' => '2026-05-01', 'status' => 'locked']);
        $this->createPayrollRunItem(['payroll_run_id' => $run2->id, 'employee_id' => $employee->id, 'professional_tax' => 0.00, 'net_pay' => 9000]);

        // Employee exits on May 31, 2026
        $fnfService = new FullAndFinalCalculationService();
        $preview = $fnfService->calculatePreview($employee, [
            'last_working_day' => '2026-05-31',
            'pending_salary_amount' => 9000,
        ]);

        // Target liability = 930. Paid = 0. Shortfall recovered at exit = 930.00 (FULL target liability recovered)
        $this->assertEquals(930.00, $preview['pt_shortfall_recovery']);
    }

    /** @test */
    public function test_state_abbreviation_tn_normalizes_to_tamil_nadu()
    {
        // Client with 'TN' state string
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'TN']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 5000,
            'hra' => 4000,
            'gross_monthly_salary' => 9000,
            'pt_applicable' => true,
        ]);

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        // 'TN' should normalize to 'Tamil Nadu' and match the slab (155.00)
        $this->assertEquals(155.00, $result['professional_tax']);
    }
}
