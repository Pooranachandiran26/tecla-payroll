<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\LeaveRequest;
use App\Services\LeavePolicyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

class LockedPayrollImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected Employee $employee;
    protected PayrollRun $lockedRun;
    protected PayrollRunItem $lockedItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->client = Client::factory()->create([
            'company_name' => 'Acme Corp',
            'client_code' => 'ACM-001',
            'contract_type' => 'agency',
            'billing_model' => 'fixed_rate',
            'status' => 'active',
            'payroll_lock_day' => 5,
            'salary_credit_day' => 7,
            'registered_state' => 'Tamil Nadu',
            'contract_start_date' => '2024-01-01',
            'pan_number' => 'AAACA1234A',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $branch = $this->client->branches()->create([
            'branch_name' => 'HQ',
            'state' => 'Tamil Nadu',
            'gstin' => '33AAAAA0000A1Z5',
            'is_head_office' => true,
        ]);

        $this->employee = Employee::create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'full_name' => 'John Doe',
            'personal_email' => 'john.doe@example.com',
            'phone_number' => '9876543210',
            'date_of_birth' => '1995-05-15',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Software Engineer',
            'employment_model' => 'agency_contract',
            'employee_code' => 'EMP-101',
            'pan_number' => 'ABCDE1234F',
            'status' => 'active',
            'basic_pay' => 30000,
            'hra' => 12000,
            'conveyance' => 1600,
            'da' => 0,
            'medical_allowance' => 1250,
            'special_allowance' => 5000,
            'other_additions' => 0,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'bank_account_number' => '111122223333',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'bank_branch' => 'Main',
            'account_holder_name' => 'John Doe',
            'uan_mode' => 'new',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ]);

        // Create a draft payroll run first, create items, then transition to locked
        $this->lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 49850.00,
            'total_net_disbursement' => 48050.00,
            'total_employer_statutory_cost' => 1950.00,
            'processed_by' => $this->admin->id,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $this->lockedItem = PayrollRunItem::create([
            'payroll_run_id' => $this->lockedRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 30000,
            'hra' => 12000,
            'conveyance' => 1600,
            'da' => 0,
            'medical_allowance' => 1250,
            'special_allowance' => 5000,
            'other_additions' => 0,
            'gross_total' => 49850,
            'employee_pf' => 1800,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 48050,
            'employer_pf' => 1950,
            'employer_esi' => 0,
            'employer_lwf' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $this->lockedRun->update([
            'status' => 'locked',
            'locked_at' => now(),
            'locked_by' => $this->admin->id,
        ]);

        $this->lockedItem = $this->lockedItem->fresh();
    }

    /**
     * Test 1: Employee salary / CTC change does not silently alter locked payroll items.
     */
    public function test_employee_salary_change_does_not_mutate_locked_payroll()
    {
        $this->employee->update([
            'basic_pay' => 50000,
            'hra' => 20000,
        ]);

        $this->lockedItem->refresh();
        $this->lockedRun->refresh();

        $this->assertEquals(30000, $this->lockedItem->basic_pay);
        $this->assertEquals(12000, $this->lockedItem->hra);
        $this->assertEquals(49850.00, $this->lockedRun->total_gross_earnings);
    }

    /**
     * Test 2: Employee bank account change does not alter locked historical payroll data.
     */
    public function test_employee_bank_change_does_not_mutate_locked_payroll()
    {
        $this->employee->update([
            'bank_account_number' => '999988887777',
            'bank_name' => 'State Bank of India',
        ]);

        $this->lockedItem->refresh();
        $this->assertEquals(48050.00, $this->lockedItem->net_pay);
        $this->assertEquals(48050.00, $this->lockedRun->fresh()->total_net_disbursement);
        $this->assertEquals('999988887777', $this->employee->fresh()->bank_account_number);
    }

    /**
     * Test 3: Leave approval for a locked period is strictly blocked.
     */
    public function test_leave_approval_blocked_for_locked_period()
    {
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'casual',
            'from_date' => '2026-06-10',
            'to_date' => '2026-06-12',
            'days_count' => 3,
            'reason' => 'Personal emergency',
            'status' => 'pending',
        ]);

        $leaveService = app(LeavePolicyService::class);

        $this->expectException(ValidationException::class);
        $leaveService->processApprovedLeave($leaveRequest);
    }

    /**
     * Test 4: Admin cannot recalculate a locked payroll run.
     */
    public function test_admin_cannot_recalculate_locked_payroll()
    {
        $response = $this->actingAs($this->admin)->post(route('payroll.run.process'), [
            'client_id' => $this->client->id,
            'payroll_month' => '2026-06-01',
        ]);

        $response->assertSessionHas('error');
        $this->lockedRun->refresh();
        $this->assertEquals('locked', $this->lockedRun->status);
    }

    /**
     * Test 5: Admin cannot delete a locked payroll run.
     */
    public function test_admin_cannot_delete_locked_payroll_run()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot delete a payroll run that is already approved or locked.');
        $this->lockedRun->delete();
    }

    /**
     * Test 6: Admin cannot directly mutate items of a locked payroll run.
     */
    public function test_admin_cannot_modify_locked_payroll_item()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot modify items of a payroll run that is already approved or locked.');
        
        $this->lockedItem->basic_pay = 40000;
        $this->lockedItem->save();
    }

    /**
     * Test 7: Admin cannot delete items of a locked payroll run.
     */
    public function test_admin_cannot_delete_locked_payroll_item()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot delete items of a payroll run that is already approved or locked.');
        
        $this->lockedItem->delete();
    }

    /**
     * Test 8: Duplicate lock request on already locked run is blocked and returns error.
     */
    public function test_duplicate_lock_request_is_blocked()
    {
        $response = $this->actingAs($this->admin)->post(route('payroll.run.lock', $this->lockedRun->id));

        $response->assertSessionHas('error', 'This payroll run is already locked.');
    }

    /**
     * Test 9: Locked payroll calculations and combined stats are 100% immutable upon browser refresh.
     */
    public function test_locked_payroll_stats_remain_immutable_on_refresh()
    {
        $statsBefore = $this->lockedRun->getCombinedStats();

        // Simulate master table mutations
        $this->employee->update([
            'basic_pay' => 99999,
            'hra' => 88888,
        ]);

        $statsAfter = $this->lockedRun->getCombinedStats();

        $this->assertEquals($statsBefore['total_gross_earnings'], $statsAfter['total_gross_earnings']);
        $this->assertEquals($statsBefore['total_net_disbursement'], $statsAfter['total_net_disbursement']);
        $this->assertEquals(49850.00, $statsAfter['total_gross_earnings']);
    }
}
