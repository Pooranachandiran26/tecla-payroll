<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\EmployeeExit;
use App\Services\FullAndFinalCalculationService;

class EmployeeExitFlowTest extends TestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;
    use WithoutMiddleware;

    protected $admin;
    protected $manager;
    protected $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
        $this->admin->update(['password_changed_at' => now()]);

        $this->manager = User::where('role', 'manager')->first() ?? User::factory()->create(['role' => 'manager']);
        $this->manager->update(['password_changed_at' => now()]);

        $client = Client::first() ?? Client::factory()->create(['notice_period_days' => 30]);
        $branch = \App\Models\ClientBranch::first() ?? \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
        
        $this->employee = Employee::first();
        if (!$this->employee) {
            $this->employee = Employee::factory()->create([
                'client_id' => $client->id,
                'branch_id' => $branch->id,
            ]);
        }

        // Ensure employee is active and has basic pay and client with notice period
        $this->employee->update([
            'status' => 'active',
            'basic_pay' => 30000,
            'lop_basis_days' => '30',
            'notice_period_days' => 30,
            'date_of_joining' => now()->subYears(5)->toDateString()
        ]);

        $client = Client::find($this->employee->client_id);
        $client->update(['default_notice_period_days' => 30]);
    }

    // ---------------------------------------------------------------
    // STAGE 1: Create initial exit record
    // ---------------------------------------------------------------
    public function test_stage1_creates_initial_exit_record()
    {
        $response = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/1", [
            'exit_type' => 'Resignation',
            'reason_category' => 'Better Opportunity',
            'submission_date' => now()->toDateString(),
            'discussed_with_employee' => true,
            'discussion_summary' => 'Seeking growth',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('employee_exits', [
            'employee_id' => $this->employee->id,
            'exit_type' => 'Resignation',
            'current_stage' => 1
        ]);
    }

    // ---------------------------------------------------------------
    // NOTICE PAY MATH — exact worked examples from spec
    // ---------------------------------------------------------------
    public function test_employer_initiated_notice_pay_exact_math()
    {
        // Employer-Initiated (ADDITION): CTC / lop_basis_days * shortfall_days
        // CTC=50000, lop_basis_days=30, shortfall=10 → ₹16,666.67
        // Use updateQuietly to bypass EmployeeObserver recalculating ctc_monthly
        $this->employee->updateQuietly([
            'ctc_monthly' => 50000,
            'basic_pay' => 25000,
            'lop_basis_days' => '30',
        ]);

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/preview-settlement", [
            'notice_shortfall_days' => 10,
            'notice_amount_type' => 'addition',
            'last_working_day' => now()->addDays(20)->toDateString(),
        ]);

        $response->assertStatus(200);
        $this->assertEquals(16666.67, $response->json('notice_amount'));
    }

    public function test_employee_initiated_notice_shortfall_exact_math()
    {
        // Employee-Initiated (DEDUCTION): Basic / lop_basis_days * shortfall_days
        // Basic=25000, lop_basis_days=30, shortfall=10 → ₹8,333.33
        // Use updateQuietly to bypass EmployeeObserver recalculating derived fields
        $this->employee->updateQuietly([
            'ctc_monthly' => 50000,
            'basic_pay' => 25000,
            'lop_basis_days' => '30',
        ]);

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/preview-settlement", [
            'notice_shortfall_days' => 10,
            'notice_amount_type' => 'deduction',
            'last_working_day' => now()->addDays(20)->toDateString(),
        ]);

        $response->assertStatus(200);
        $this->assertEquals(8333.33, $response->json('notice_amount'));
    }

    // ---------------------------------------------------------------
    // GRATUITY BOUNDARY TESTS — exact worked examples
    // ---------------------------------------------------------------
    public function test_gratuity_5y7m_rounds_to_6_years()
    {
        // 5y7m: DOJ 2021-01-01, LWD 2026-08-01 → tenure ~2038 days
        // round(2038/365) = round(5.58) = 6
        // gratuity = (30000/26) * 15 * 6 = ₹103,846.15
        $this->employee->update([
            'basic_pay' => 30000,
            'date_of_joining' => '2021-01-01',
        ]);

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/preview-settlement", [
            'last_working_day' => '2026-08-01',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(103846.15, $response->json('gratuity_amount'));
    }

    public function test_gratuity_5y5m_rounds_to_5_years()
    {
        // 5y5m: DOJ 2021-01-01, LWD 2026-06-01 → tenure ~1977 days
        // round(1977/365) = round(5.42) = 5
        // gratuity = (30000/26) * 15 * 5 = ₹86,538.46
        $this->employee->update([
            'basic_pay' => 30000,
            'date_of_joining' => '2021-01-01',
        ]);

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/preview-settlement", [
            'last_working_day' => '2026-06-01',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(86538.46, $response->json('gratuity_amount'));
    }

    // ---------------------------------------------------------------
    // PAYROLL LOCK — mock isPayrollLocked to true to prove blocking logic
    // ---------------------------------------------------------------
    public function test_payroll_lock_blocks_exit_in_locked_month()
    {
        $exit = EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'exit_type' => 'Resignation',
            'current_stage' => 1,
        ]);

        // Mock the service to return true for isPayrollLocked
        $mockCalcService = $this->partialMock(FullAndFinalCalculationService::class, function ($mock) {
            $mock->shouldReceive('isPayrollLocked')->andReturn(true);
        });

        $response = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/2", [
            'last_working_day' => now()->addDays(15)->toDateString(),
            'notice_shortfall_days' => 15,
            'notice_amount_type' => 'deduction',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['last_working_day']);
    }

    // ---------------------------------------------------------------
    // STAGE 5 SETTLEMENT DRAFT & SUBMISSION
    // ---------------------------------------------------------------
    public function test_stage5_submission_saves_financial_draft()
    {
        $exit = EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'exit_type' => 'Resignation',
            'current_stage' => 4,
        ]);

        $payload = [
            'last_working_day' => now()->addDays(15)->toDateString(),
            'notice_shortfall_days' => 15,
            'notice_amount_type' => 'deduction',
            'unused_leaves' => 10,
            'loan_recovery_amount' => 500,
            'bonus_amount' => 2000,
            'pending_salary_amount' => 0,
            'tds_amount' => 0,
            'adhoc_adjustments' => [['amount' => 1000, 'reason' => 'travel']],
            'is_submitting_for_approval' => true,
        ];

        $response = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/5", $payload);
        $response->assertStatus(200);

        $this->assertDatabaseHas('employee_exits', [
            'id' => $exit->id,
            'settlement_status' => 'pending_approval',
            'unused_leaves' => 10,
            'bonus_amount' => 2000,
            'loan_recovery_amount' => 500,
        ]);
    }

    // ---------------------------------------------------------------
    // ADMIN APPROVAL
    // ---------------------------------------------------------------
    public function test_admin_can_approve_settlement()
    {
        $exit = EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'exit_type' => 'Resignation',
            'current_stage' => 5,
            'settlement_status' => 'pending_approval'
        ]);

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/approve");
        $response->assertStatus(200);

        $this->assertDatabaseHas('employee_exits', [
            'id' => $exit->id,
            'settlement_status' => 'approved',
        ]);
    }

    // ---------------------------------------------------------------
    // FULL FLOW: stage 1 → settlement → approve → confirm → exited
    // ---------------------------------------------------------------
    public function test_full_exit_flow_stage1_through_confirm()
    {
        // Stage 1
        $r1 = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/1", [
            'exit_type' => 'Resignation',
            'reason_category' => 'Better Opportunity',
            'submission_date' => now()->toDateString(),
            'discussed_with_employee' => true,
            'discussion_summary' => 'Growth opportunity',
        ]);
        $r1->assertStatus(200);

        // Stage 2
        $r2 = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/2", [
            'last_working_day' => now()->addDays(30)->toDateString(),
            'notice_shortfall_days' => 0,
            'notice_amount_type' => 'none',
        ]);
        $r2->assertStatus(200);

        // Stage 3
        $r3 = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/3", [
            'clearance_laptop' => 'yes',
            'clearance_idcard' => 'yes',
            'clearance_manager' => 'yes',
            'clearance_itaccess' => 'yes',
            'clearance_handover' => 'yes',
            'clearance_client' => 'na',
        ]);
        $r3->assertStatus(200);

        // Stage 4
        $r4 = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/4", [
            'interview_reason' => 'Better growth',
            'would_recommend' => 'yes',
            'star_rating' => 4,
        ]);
        $r4->assertStatus(200);

        // Stage 5 (submit for approval)
        $r5 = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/5", [
            'last_working_day' => now()->addDays(30)->toDateString(),
            'notice_shortfall_days' => 0,
            'notice_amount_type' => 'none',
            'unused_leaves' => 0,
            'loan_recovery_amount' => 0,
            'bonus_amount' => 0,
            'pending_salary_amount' => 0,
            'tds_amount' => 0,
            'adhoc_adjustments' => [],
            'is_submitting_for_approval' => true,
        ]);
        $r5->assertStatus(200);

        // Approve
        $rApprove = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/approve");
        $rApprove->assertStatus(200);

        $this->assertDatabaseHas('employee_exits', [
            'employee_id' => $this->employee->id,
            'settlement_status' => 'approved',
        ]);

        // Confirm
        $rConfirm = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/confirm");
        $rConfirm->assertStatus(200);

        // Employee status should be 'exited'
        $this->assertDatabaseHas('employees', [
            'id' => $this->employee->id,
            'status' => 'exited',
        ]);

        // Exit record should be at stage 6 with confirmed_at set
        $exit = EmployeeExit::where('employee_id', $this->employee->id)->latest('id')->first();
        $this->assertEquals(6, $exit->current_stage);
        $this->assertNotNull($exit->confirmed_at);
    }

    // ---------------------------------------------------------------
    // CANONICAL PF CHECK — must still be 1950 (untouched)
    // ---------------------------------------------------------------
    public function test_canonical_pf_check_still_1950()
    {
        $emp = Employee::where('employee_code', 'TEC-088')->first();
        if (!$emp) {
            $client = Client::first() ?? Client::factory()->create();
            $branch = \App\Models\ClientBranch::first() ?? \App\Models\ClientBranch::factory()->create(['client_id' => $client->id]);
            
            $emp = Employee::factory()->create([
                'employee_code' => 'TEC-088',
                'client_id' => $client->id,
                'branch_id' => $branch->id,
                'basic_pay' => 25000,
                'pf_applicable' => 1,
                'bank_account_number' => 'TEC088BANK123',
                'pan_number' => 'TECPAN123Z',
                'aadhaar_number' => '888888888888',
                'personal_email' => 'tec088@example.com'
            ]);
        }
        $this->assertEquals('1950.00', $emp->employer_pf_monthly);
    }
}
