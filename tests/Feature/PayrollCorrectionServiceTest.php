<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\EmployeeQuery;
use App\Services\PayrollCorrectionService;
use Carbon\Carbon;

class PayrollCorrectionServiceTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected Employee $employee;
    protected PayrollRun $lockedRun;
    protected PayrollRunItem $originalItem;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->client = Client::factory()->create(['company_name' => 'Acme Corp', 'weekly_off_pattern' => 'sat,sun', 'registered_state' => 'Maharashtra']);
        \App\Models\ClientBranch::factory()->create(['client_id' => $this->client->id, 'state' => 'Maharashtra']);
        
        \DB::table('pt_slabs')->insert([
            'state' => 'Maharashtra',
            'min_salary' => 10000.00,
            'max_salary' => 999999.00,
            'deduction_amount' => 200.00,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => 1,
            'basic_pay' => 20000.00,
            'hra' => 5000.00,
            'pf_applicable' => true,
            'pt_applicable' => true,
            'status' => 'active',
        ]);

        $this->lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 25000.00,
            'total_net_disbursement' => 23000.00,
            'total_employer_statutory_cost' => 1950.00,
        ]);

        $this->originalItem = PayrollRunItem::create([
            'payroll_run_id' => $this->lockedRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 25.0,
            'lop_days' => 5.0,
            'basic_pay' => 16666.67,
            'hra' => 4166.67,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => 20833.34,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 4166.66,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 18833.34,
            'employer_pf' => 1950.00,
            'employer_esi' => 0.00,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
        ]);

        // Lock the payroll run after creating initial items
        \DB::table('payroll_runs')->where('id', $this->lockedRun->id)->update([
            'status' => 'locked',
            'locked_at' => now(),
        ]);
        $this->lockedRun->refresh();
    }

    public function test_original_payroll_run_item_is_byte_identical_after_correction()
    {
        $this->actingAs($this->admin);

        $checksumBefore = md5(json_encode($this->originalItem->fresh()->toArray()));

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 30.0, 0.0);

        $service->applyCorrection($this->employee, $this->lockedRun, $preview, 'Approved leave post-lock');

        $checksumAfter = md5(json_encode($this->originalItem->fresh()->toArray()));

        $this->assertEquals($checksumBefore, $checksumAfter, "Original locked payroll_run_item must remain byte-identical before and after correction.");
    }

    public function test_correction_recalculates_all_statutory_components_correctly()
    {
        $this->actingAs($this->admin);

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 30.0, 0.0);

        // Correct gross is 25,000. Correct PF is 1,800. Correct PT is 200. Correct Net is 23,000.
        // Original gross was 20,833.34. Original Net was 18,833.34.
        $this->assertEquals(4166.66, $preview['delta']['gross_total']);
        $this->assertEquals(0.00, $preview['delta']['employee_pf']); // PF capped at 1800 in both
        $this->assertEquals(4166.66, $preview['delta']['net_pay']);

        $item = $service->applyCorrection($this->employee, $this->lockedRun, $preview, 'Recalculation test');

        $this->assertTrue((bool)$item->is_correction);
        $this->assertEquals('Recalculation test', $item->correction_reason);
        $this->assertEquals(4166.66, (float)$item->net_pay);
    }

    public function test_mandatory_reason_is_required()
    {
        $this->actingAs($this->admin);

        $response = $this->post(route('payroll.correction.store'), [
            'parent_run_id' => $this->lockedRun->id,
            'employee_id' => $this->employee->id,
            'corrected_paid_days' => 30,
            'corrected_lop_days' => 0,
            'reason' => '', // Empty reason
        ]);

        $response->assertSessionHasErrors('reason');
    }

    public function test_explicitly_selected_employee_query_is_resolved()
    {
        $this->actingAs($this->admin);

        $query = EmployeeQuery::create([
            'employee_id' => $this->employee->id,
            'client_id' => $this->client->id,
            'subject' => 'Incorrect LOP deducted for July',
            'category' => 'payroll',
            'message' => 'I was present on July 15',
            'status' => 'pending',
        ]);

        $response = $this->post(route('payroll.correction.store'), [
            'parent_run_id' => $this->lockedRun->id,
            'employee_id' => $this->employee->id,
            'corrected_paid_days' => 30,
            'corrected_lop_days' => 0,
            'reason' => 'Resolved leave query',
            'employee_query_id' => $query->id, // Explicit selection
        ]);

        $response->assertRedirect();

        $query->refresh();
        $this->assertEquals('resolved', $query->status);
        $this->assertNotNull($query->correction_run_item_id);
    }
}
