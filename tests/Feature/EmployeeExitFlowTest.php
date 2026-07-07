<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\EmployeeExit;

class EmployeeExitFlowTest extends TestCase
{
    use DatabaseTransactions;
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
        
        $this->employee = Employee::first();
        if (!$this->employee) {
            $this->markTestSkipped('No employees found in DB.');
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

    public function test_stage1_creates_initial_exit_record()
    {
        $response = $this->actingAs($this->manager)->postJson("/employees/{$this->employee->id}/exit/stage/1", [
            'exit_type' => 'Resignation',
            'reason_category' => 'Better Opportunity',
            'submission_date' => now()->toDateString(),
            'discussed_with_employee' => true,
            'discussion_summary' => 'Seeking growth',
        ]);

        if ($response->status() === 302) {
            dump($response->headers->get('Location'));
        }
        $response->assertStatus(200);
        $this->assertDatabaseHas('employee_exits', [
            'employee_id' => $this->employee->id,
            'exit_type' => 'Resignation',
            'current_stage' => 1
        ]);
    }

    public function test_stage5_preview_calculates_correct_settlement()
    {
        // 30 days notice required, serving 15 days -> 15 days shortfall. (Resignation -> deduction)
        // Leave encashment: 10 leaves * (30000 / 30) = 10000
        // Gratuity: > 4 yrs 240 days. (5 yrs * 15 * 30000 / 26) = 86538
        
        $submissionDate = now()->toDateString();
        $lwd = now()->addDays(15)->toDateString();
        
        $payload = [
            'last_working_day' => $lwd,
            'notice_shortfall_days' => 15,
            'notice_amount_type' => 'deduction',
            'unused_leaves' => 10,
            'loan_recovery_amount' => 500,
            'bonus_amount' => 2000,
            'pending_salary_amount' => 0,
            'tds_amount' => 0,
            'adhoc_adjustments' => []
        ];

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/preview-settlement", $payload);

        $response->assertStatus(200);
        
        // 15 days shortfall deduction: 15 * 1000 = 15000 deduction
        $response->assertJson([
            'leave_encashment_amount' => 10000,
            'notice_amount' => 15000, 
            'gratuity_amount' => 86538.46, // approx 86538.46
            'loan_recovery_amount' => 500,
            'bonus_amount' => 2000,
        ]);
    }

    public function test_stage5_submission_saves_financial_draft()
    {
        // Create initial exit record
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

    public function test_stage6_confirmation_deactivates_employee()
    {
        $exit = EmployeeExit::create([
            'employee_id' => $this->employee->id,
            'exit_type' => 'Resignation',
            'current_stage' => 5,
            'settlement_status' => 'approved',
        ]);

        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/confirm");
        $response->assertStatus(200);

        $this->assertDatabaseHas('employees', [
            'id' => $this->employee->id,
            'status' => 'exited'
        ]);

        $this->assertDatabaseHas('employee_exits', [
            'id' => $exit->id,
            'current_stage' => 6
        ]);
    }
}
