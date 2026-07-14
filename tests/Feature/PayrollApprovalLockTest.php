<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EmployeeExit;
use Carbon\Carbon;

class PayrollApprovalLockTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->client = Client::factory()->create(['status' => 'active']);
        $this->branch = ClientBranch::factory()->create(['client_id' => $this->client->id]);
        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'status' => 'active',
            'employee_code' => 'TEC-088',
            'basic_pay' => 15000,
            'hra' => 7500,
            'da' => 0,
            'conveyance' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);
    }

    /**
     * Test 1: Approval blocks modifications/deletions of runs and items.
     */
    public function test_payroll_immutability_upon_approval()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 20000,
            'total_net_disbursement' => 18000,
            'total_employer_statutory_cost' => 1950,
        ]);

        $item = PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $this->employee->id,
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
            'attendance_source' => 'live_punch',
        ]);

        // Approve the run via endpoint
        $response = $this->actingAs($this->admin)->post("/payroll/{$run->id}/approve");
        $response->assertSessionHas('success');
        $this->assertEquals('approved', $run->fresh()->status);

        // Verify model updates throw exception
        try {
            $run->fresh()->update(['total_gross_earnings' => 25000]);
            $this->fail("Expected exception not thrown for updating approved payroll run.");
        } catch (\Exception $e) {
            $this->assertStringContainsString("Cannot modify details of an approved or locked payroll run", $e->getMessage());
        }

        // Verify run item saving throws exception
        try {
            $item->fresh()->update(['basic_pay' => 16000]);
            $this->fail("Expected exception not thrown for updating approved payroll run items.");
        } catch (\Exception $e) {
            $this->assertStringContainsString("Cannot modify items of a payroll run that is already approved or locked", $e->getMessage());
        }

        // Verify run item deleting throws exception
        try {
            $item->fresh()->delete();
            $this->fail("Expected exception not thrown for deleting approved payroll run items.");
        } catch (\Exception $e) {
            $this->assertStringContainsString("Cannot delete items of a payroll run that is already approved or locked", $e->getMessage());
        }
    }

    /**
     * Test 2: Transition approved->locked succeeds, locked runs are deleted block.
     */
    public function test_payroll_transition_approved_to_locked()
    {
        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
        ]);

        // Fake transitioning status to approved
        $run->update(['status' => 'approved']);
        $this->assertEquals('approved', $run->fresh()->status);

        // Lock the run via endpoint
        $response = $this->actingAs($this->admin)->post("/payroll/{$run->id}/lock");
        $response->assertSessionHas('success');
        $this->assertEquals('locked', $run->fresh()->status);

        // Verify deleting locked run throws exception
        try {
            $run->fresh()->delete();
            $this->fail("Expected exception not thrown for deleting locked payroll run.");
        } catch (\Exception $e) {
            $this->assertStringContainsString("Cannot delete a payroll run that is already approved or locked", $e->getMessage());
        }
    }

    /**
     * Test 3: Exits are blocked for locked/approved month.
     */
    public function test_exit_blocked_for_locked_payroll()
    {
        // Setup an approved payroll run for client in June 2026
        PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'approved',
        ]);

        // Attempt exit stage 2 (Notice) with LWD in June 2026
        $response = $this->actingAs($this->admin)->postJson("/employees/{$this->employee->id}/exit/stage/2", [
            'last_working_day' => '2026-06-15',
            'notice_shortfall_days' => 0,
            'notice_amount_type' => 'none'
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['last_working_day']);
    }

    /**
     * Test 4: Employee deletion is blocked for locked/approved payroll.
     */
    public function test_employee_deletion_blocked_for_locked_payroll()
    {
        // Setup a locked payroll run for client in June 2026
        PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
        ]);

        $response = $this->actingAs($this->admin)->delete("/employees/{$this->employee->id}", [
            'confirm_text' => 'DELETE',
            'reason' => 'Deleting employee for payroll test'
        ]);
        
        $response->assertRedirect();
        $response->assertSessionHas('error', 'Cannot delete: this employee has locked payroll records.');
    }

    /**
     * Test 5: Canonical PF Check
     */
    public function test_canonical_pf_check()
    {
        $this->employee->update([
            'employer_pf_monthly' => 1950.00
        ]);

        $emp = Employee::withTrashed()->where('employee_code', 'TEC-088')->first();
        $this->assertNotNull($emp);
        $this->assertEquals(1950.00, $emp->employer_pf_monthly);
    }
}
