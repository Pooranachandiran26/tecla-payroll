<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\AttendanceRecord;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\SalaryCalculationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCycleHardBlockTest extends TestCase
{
    use RefreshDatabase;

    protected $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    private function createVerifiedEmployee(Client $client, array $overrides = []): Employee
    {
        $rand = rand(100000, 999999);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'is_head_office' => true]);
        $emp = Employee::factory()->create(array_merge([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => "TST{$rand}",
            'personal_email' => "tst{$rand}@example.com",
            'pan_number' => "PAN{$rand}T",
            'aadhaar_number' => "8888{$rand}T",
            'bank_account_number' => "2000{$rand}T",
            'basic_pay' => 15000,
            'hra' => 5000,
            'bank_ifsc' => 'HDFC0001234',
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1995-01-01',
        ], $overrides));

        foreach ($emp->required_document_types as $dt) {
            EmployeeDocument::create([
                'employee_id' => $emp->id,
                'document_type' => $dt,
                'file_path' => 'doc.pdf',
                'status' => 'verified',
            ]);
        }

        return $emp;
    }

    /** @test */
    public function scenario_1_future_month_processing_is_hard_blocked()
    {
        Carbon::setTestNow(Carbon::parse('2026-07-29'));

        $client = Client::factory()->create(['payroll_convention' => 'calendar_month']);
        $this->createVerifiedEmployee($client);

        $response = $this->actingAs($this->adminUser)
            ->post(route('payroll.run.process'), [
                'client_id' => $client->id,
                'payroll_month' => '2026-08-01', // Future month August 2026
            ]);

        $response->assertSessionHas('error', 'Cannot process payroll for August 2026 — this cycle has not ended yet (ends Aug 31, 2026). Payroll can only be run after the cycle completes.');
        $this->assertDatabaseMissing('payroll_runs', [
            'client_id' => $client->id,
            'payroll_month' => '2026-08-01',
        ]);
    }

    /** @test */
    public function scenario_2_current_month_incomplete_cycle_processing_is_hard_blocked()
    {
        Carbon::setTestNow(Carbon::parse('2026-07-29'));

        $client = Client::factory()->create(['payroll_convention' => 'calendar_month']);
        $this->createVerifiedEmployee($client);

        $response = $this->actingAs($this->adminUser)
            ->post(route('payroll.run.process'), [
                'client_id' => $client->id,
                'payroll_month' => '2026-07-01', // Current month July 2026 (ends July 31)
            ]);

        $response->assertSessionHas('error', 'Cannot process payroll for July 2026 — this cycle has not ended yet (ends Jul 31, 2026). Payroll can only be run after the cycle completes.');
        $this->assertDatabaseMissing('payroll_runs', [
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
        ]);
    }

    /** @test */
    public function scenario_3a_current_month_custom_cycle_after_cycle_end_but_before_calendar_month_end_succeeds()
    {
        // TODAY IS JULY 29, 2026 (AFTER July 25 cycle-end, BEFORE July 31 calendar-month-end)
        Carbon::setTestNow(Carbon::parse('2026-07-29'));

        // Custom Cycle Client ending on 25th (cycle ended July 25, 2026)
        $customClient = Client::factory()->create([
            'payroll_convention' => 'custom_cycle',
            'custom_cycle_end_day' => 25,
        ]);
        $empCustom = $this->createVerifiedEmployee($customClient);
        for ($d = 1; $d <= 25; $d++) {
            AttendanceRecord::create([
                'employee_id' => $empCustom->id,
                'attendance_date' => sprintf('2026-07-%02d', $d),
                'status' => 'present',
            ]);
        }

        // On July 29, processing July 2026 for Custom Cycle (ends July 25) MUST SUCCEED,
        // proving it does NOT fall back to calendar month end (July 31).
        $resCustom = $this->actingAs($this->adminUser)
            ->post(route('payroll.run.process'), [
                'client_id' => $customClient->id,
                'payroll_month' => '2026-07-01',
            ]);

        $resCustom->assertSessionHas('success');
        $this->assertDatabaseHas('payroll_runs', [
            'client_id' => $customClient->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);
    }

    /** @test */
    public function scenario_3b_past_month_calendar_cycle_succeeds()
    {
        Carbon::setTestNow(Carbon::parse('2026-07-29'));

        // Past Month June 2026 for Calendar Month Client (ended June 30, 2026)
        $pastClient = Client::factory()->create(['payroll_convention' => 'calendar_month']);
        $empPast = $this->createVerifiedEmployee($pastClient);
        for ($d = 1; $d <= 30; $d++) {
            AttendanceRecord::create([
                'employee_id' => $empPast->id,
                'attendance_date' => sprintf('2026-06-%02d', $d),
                'status' => 'present',
            ]);
        }

        $resPast = $this->actingAs($this->adminUser)
            ->post(route('payroll.run.process'), [
                'client_id' => $pastClient->id,
                'payroll_month' => '2026-06-01',
            ]);

        $resPast->assertSessionHas('success');
        $this->assertDatabaseHas('payroll_runs', [
            'client_id' => $pastClient->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);
    }

    /** @test */
    public function scenario_4a_past_locked_period_corrections_and_supplementary_runs_are_allowed()
    {
        Carbon::setTestNow(Carbon::parse('2026-07-29'));

        // Past month June 2026 (ended June 30, 2026)
        $client = Client::factory()->create(['payroll_convention' => 'calendar_month']);
        $emp = $this->createVerifiedEmployee($client);
        for ($d = 1; $d <= 30; $d++) {
            AttendanceRecord::create([
                'employee_id' => $emp->id,
                'attendance_date' => sprintf('2026-06-%02d', $d),
                'status' => 'present',
            ]);
        }

        // Process and lock June 2026 parent run
        $this->actingAs($this->adminUser)
            ->post(route('payroll.run.process'), [
                'client_id' => $client->id,
                'payroll_month' => '2026-06-01',
            ]);

        $parentRun = PayrollRun::where('client_id', $client->id)->where('payroll_month', '2026-06-01')->first();
        $parentRun->update(['status' => 'approved']);
        $this->actingAs($this->adminUser)->post(route('payroll.run.lock', $parentRun->id));

        // Submit Correction for June 2026 (past period)
        $corrResponse = $this->actingAs($this->adminUser)
            ->post(route('payroll.correction.store'), [
                'parent_run_id' => $parentRun->id,
                'employee_id' => $emp->id,
                'corrected_paid_days' => 25,
                'corrected_lop_days' => 5,
                'reason' => 'June LOP adjustment',
            ]);

        $corrResponse->assertSessionHas('success');
        $this->assertDatabaseHas('payroll_runs', [
            'parent_run_id' => $parentRun->id,
        ]);
    }

    /** @test */
    public function scenario_4b_forced_early_parent_run_correction_attempt_before_cycle_end_is_hard_blocked()
    {
        // Simulate today is July 15 (before July 31 cycle end)
        Carbon::setTestNow(Carbon::parse('2026-07-15'));

        $client = Client::factory()->create(['payroll_convention' => 'calendar_month']);
        $emp = $this->createVerifiedEmployee($client);

        // Force create a parent run for July 2026 and lock it on July 15
        $parentRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);

        \App\Models\PayrollRunItem::create([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $emp->id,
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
            'employer_epf' => 550.5,
            'employer_eps' => 1249.5,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'attendance_source' => 'live_punch',
        ]);

        $parentRun->update(['status' => 'locked']);

        // Attempt correction on July 15 for July 2026
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot process payroll for July 2026 — this cycle has not ended yet (ends Jul 31, 2026). Payroll can only be run after the cycle completes.');

        $corrSvc = app(\App\Services\PayrollCorrectionService::class);
        $corrSvc->calculateCorrectionPreview($emp, $parentRun, 25.0, 5.0);
    }

    /** @test */
    public function scenario_5_canonical_pf_calculation_remains_exact_1950()
    {
        $client = Client::factory()->create(['edli_exempted' => false]);
        $emp = $this->createVerifiedEmployee($client, [
            'basic_pay' => 15000,
            'pf_applicable' => true,
            'eps_applicable' => true,
            'date_of_birth' => '1995-01-01',
        ]);

        $calcSvc = app(SalaryCalculationService::class);
        $calc = $calcSvc->calculateStructuralSalary($emp);

        $this->assertEquals(1950.00, $calc['employer_pf_monthly']);
        $this->assertEquals(550.50, $calc['employer_epf_monthly']);
        $this->assertEquals(1249.50, $calc['employer_eps_monthly']);
    }
}
