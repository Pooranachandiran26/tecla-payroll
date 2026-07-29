<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\MonthlyPayrollCalculator;
use App\Services\PayrollCorrectionService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollRunItemsEpsSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function createFullAttendance(Employee $employee, string $month = '2026-05')
    {
        $start = Carbon::parse($month . '-01');
        $days = $start->daysInMonth;
        for ($i = 1; $i <= $days; $i++) {
            $date = $start->copy()->day($i)->toDateString();
            DB::table('attendance_records')->insert([
                'employee_id' => $employee->id,
                'attendance_date' => $date,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /** @test */
    public function test_1_new_payroll_run_item_populates_employer_epf_and_eps_summing_exactly_to_1800_epf_eps_share()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2020-01-01',
        ]);

        $this->createFullAttendance($employee, '2026-05');

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-05-01',
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0.00,
            'total_net_disbursement' => 0.00,
            'total_employer_statutory_cost' => 0.00,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $run);

        $item = DB::table('payroll_run_items')
            ->where('payroll_run_id', $run->id)
            ->where('employee_id', $employee->id)
            ->first();

        $this->assertNotNull($item);
        $this->assertEquals(1950.00, (float)$item->employer_pf);
        $this->assertEquals(550.50, (float)$item->employer_epf);
        $this->assertEquals(1249.50, (float)$item->employer_eps);

        // Sum Check: employer_epf + employer_eps must EQUAL 1800.00 (the 12% contribution share)
        $this->assertEquals(1800.00, round((float)$item->employer_epf + (float)$item->employer_eps, 2));
    }

    /** @test */
    public function test_2_correction_run_item_populates_employer_epf_and_eps_deltas()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 15000,
            'hra' => 5000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2020-01-01',
        ]);

        $this->createFullAttendance($employee, '2026-05');

        $parentRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-05-01',
            'status' => 'locked',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000.00,
            'total_net_disbursement' => 18000.00,
            'total_employer_statutory_cost' => 1950.00,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($employee, $parentRun);

        $parentItem = DB::table('payroll_run_items')
            ->where('payroll_run_id', $parentRun->id)
            ->where('employee_id', $employee->id)
            ->first();

        // 1. Original Parent Item values for 30 paid days (31 calendar days in May)
        $this->assertEquals(550.50, (float)$parentItem->employer_epf);
        $this->assertEquals(1249.50, (float)$parentItem->employer_eps);
        $this->assertEquals(1950.00, (float)$parentItem->employer_pf);

        // 2. Perform Attendance Correction for 28 paid days (2 LOP days)
        $correctionService = app(PayrollCorrectionService::class);
        $preview = $correctionService->calculateCorrectionPreview($employee, $parentRun, 28, 2);
        $corrItem = $correctionService->applyCorrection($employee, $parentRun, $preview, 'Attendance correction');

        // 3. Corrected Absolute values calculated by SalaryCalculationService for 28 paid days
        // Basic LOP deduction = 15000 * (2/26) = 1153.85 -> Prorated Basic = 13846.15
        $correctedEpf = (float)$preview['corrected']['employer_epf']; // 508.16
        $correctedEps = (float)$preview['corrected']['employer_eps']; // 1153.38
        $this->assertEquals(508.16, $correctedEpf);
        $this->assertEquals(1153.38, $correctedEps);

        // 4. Independent Expected Deltas (Corrected - Original)
        $expectedEpfDelta = round($correctedEpf - 550.50, 2); // 508.16 - 550.50 = -42.34
        $expectedEpsDelta = round($correctedEps - 1249.50, 2); // 1153.38 - 1249.50 = -96.12

        $this->assertEquals(-42.34, $expectedEpfDelta);
        $this->assertEquals(-96.12, $expectedEpsDelta);

        // 5. Verify Stored Correction Item Deltas match independent calculations
        $this->assertEquals(-42.34, (float)$corrItem->employer_epf);
        $this->assertEquals(-96.12, (float)$corrItem->employer_eps);

        // 6. Confirm stored deltas are NOT equal to absolute values (+508.16 != -42.34 and +1153.38 != -96.12)
        $this->assertNotEquals($correctedEpf, (float)$corrItem->employer_epf);
        $this->assertNotEquals($correctedEps, (float)$corrItem->employer_eps);
    }

    /** @test */
    public function test_3_historical_rows_remain_null_for_employer_epf_and_eps()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
        ]);

        // Insert a raw row directly representing historical run item
        $runId = DB::table('payroll_runs')->insertGetId([
            'client_id' => $client->id,
            'payroll_month' => '2026-04-01',
            'status' => 'locked',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000.00,
            'total_net_disbursement' => 18000.00,
            'total_employer_statutory_cost' => 1950.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $itemId = DB::table('payroll_run_items')->insertGetId([
            'payroll_run_id' => $runId,
            'employee_id' => $employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 15000,
            'hra' => 5000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 20000,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 200,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 18000,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'attendance_source' => 'live_punch',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $item = DB::table('payroll_run_items')->where('id', $itemId)->first();
        $this->assertNull($item->employer_epf);
        $this->assertNull($item->employer_eps);
    }

    /** @test */
    public function test_4_canonical_pf_calculation_remains_exact_1950()
    {
        $client = Client::factory()->create();
        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'basic_pay' => 40000,
            'hra' => 10000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2020-01-01',
        ]);

        $this->createFullAttendance($employee, '2026-05');

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-05-01',
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0.00,
            'total_net_disbursement' => 0.00,
            'total_employer_statutory_cost' => 0.00,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $calculator->calculateForEmployee($employee, $run);

        $item = DB::table('payroll_run_items')
            ->where('payroll_run_id', $run->id)
            ->where('employee_id', $employee->id)
            ->first();

        // Standard Total Er PF = 1950 (550.50 EPF + 1249.50 EPS + 75 EDLI + 75 Admin = 1950)
        $this->assertEquals(1950.00, (float)$item->employer_pf);
        $this->assertEquals(550.50, (float)$item->employer_epf);
        $this->assertEquals(1249.50, (float)$item->employer_eps);
    }
}
