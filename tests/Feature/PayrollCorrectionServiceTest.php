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
        $this->assertEquals('in_progress', $query->status);
        $this->assertNotNull($query->correction_run_item_id);
    }

    public function test_two_sequential_corrections_only_latest_delta_applies()
    {
        $this->actingAs($this->admin);
        $service = app(PayrollCorrectionService::class);

        // Parent item: paid_days = 25.0 (setUp baseline)
        // Correction #1: correct to 29.0 paid days (delta = +4.0)
        $preview1 = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 29.0, 1.0);
        $service->applyCorrection($this->employee, $this->lockedRun, $preview1, 'First correction');

        // Lock Supp Run #1
        $supp1 = PayrollRun::where('parent_run_id', $this->lockedRun->id)->where('status', 'draft')->first();
        $supp1->update(['status' => 'locked', 'locked_at' => now()]);

        // Correction #2: correct to 28.0 paid days (delta = +3.0)
        $preview2 = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 28.0, 2.0);
        $service->applyCorrection($this->employee, $this->lockedRun, $preview2, 'Second correction');

        // Lock Supp Run #2
        $supp2 = PayrollRun::where('parent_run_id', $this->lockedRun->id)->where('status', 'draft')->first();
        $supp2->update(['status' => 'locked', 'locked_at' => now()]);

        // Hit indexApproval
        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $this->employee->id);

        // Base 25.0 + latest delta (+3.0) = 28.0 paid days, NOT 25.0 + 4.0 + 3.0 = 32.0!
        $this->assertEquals(28.0, (float)data_get($empItem, 'paid_days'));
    }

    public function test_partial_lop_baseline_correction_calculates_correctly()
    {
        $this->actingAs($this->admin);
        $service = app(PayrollCorrectionService::class);

        // Baseline: 25 paid days / 5 LOP. Correct to 27 paid days / 3 LOP.
        $preview = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 27.0, 3.0);
        $service->applyCorrection($this->employee, $this->lockedRun, $preview, 'Partial LOP correction');

        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $this->employee->id);

        $this->assertEquals(27.0, (float)data_get($empItem, 'paid_days'));
        $this->assertEquals(3.0, (float)data_get($empItem, 'lop_days'));
    }

    public function test_single_correction_regression_safety_identical_behavior()
    {
        $this->actingAs($this->admin);
        $service = app(PayrollCorrectionService::class);

        // Baseline: 25 paid days. Correct to 30 paid days (delta +5.0)
        $preview = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 30.0, 0.0);
        $service->applyCorrection($this->employee, $this->lockedRun, $preview, 'Single correction safety');

        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $this->employee->id);

        $this->assertEquals(30.0, (float)data_get($empItem, 'paid_days'));
        $this->assertEquals(0.0, (float)data_get($empItem, 'lop_days'));
    }

    public function test_tec129_reproduction_run22_supp27_supp28_shows_29_days()
    {
        $this->actingAs($this->admin);

        // Set up parent run and item with exact TEC-129 baseline: 30 paid days, gross 30000, net 23200
        $tec129Emp = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => 1,
            'employee_code' => 'TEC-129-TEST-' . rand(100, 999),
            'pan_number' => 'PAN' . rand(10000, 99999) . 'A',
            'aadhaar_number' => '1234' . rand(10000000, 99999999),
            'bank_account_number' => '1234' . rand(100000, 999999),
            'basic_pay' => 30000.00,
            'status' => 'active',
        ]);

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-09-01',
            'status' => 'draft',
        ]);

        $parentItem = PayrollRunItem::create([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $tec129Emp->id,
            'paid_days' => 30.0,
            'lop_days' => 0.0,
            'basic_pay' => 30000.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => 30000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 23200.00,
            'employer_pf' => 1950.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'is_excluded' => false,
        ]);
        $parentRun->update(['status' => 'locked']);

        // Supp Run #27 item (delta: -1 paid day, -1111.09 net)
        $supp27 = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $parentRun->payroll_month,
            'parent_run_id' => $parentRun->id,
            'status' => 'draft',
        ]);
        PayrollRunItem::create([
            'payroll_run_id' => $supp27->id,
            'employee_id' => $tec129Emp->id,
            'paid_days' => -1.0,
            'lop_days' => 1.0,
            'basic_pay' => -1111.09,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => -1111.09,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => -1111.09,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'is_correction' => true,
            'original_payroll_run_item_id' => $parentItem->id,
        ]);
        $supp27->update(['status' => 'locked']);

        // Supp Run #28 item (duplicate re-submission: delta -1 paid day, -1111.09 net)
        $supp28 = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $parentRun->payroll_month,
            'parent_run_id' => $parentRun->id,
            'status' => 'draft',
        ]);
        PayrollRunItem::create([
            'payroll_run_id' => $supp28->id,
            'employee_id' => $tec129Emp->id,
            'paid_days' => -1.0,
            'lop_days' => 1.0,
            'basic_pay' => -1111.09,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => -1111.09,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => -1111.09,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'is_correction' => true,
            'original_payroll_run_item_id' => $parentItem->id,
        ]);
        $supp28->update(['status' => 'locked']);

        // Assert indexApproval returns 29.0 paid days and 22088.91 net pay (NOT 28.0 days / 20977.82)
        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $parentRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $tec129Emp->id);

        $this->assertEquals(29.0, (float)data_get($empItem, 'paid_days'));
        $this->assertEquals(22088.91, (float)data_get($empItem, 'net_pay'));
    }

    public function test_pure_base_items_zero_corrections_retains_exact_values()
    {
        $this->actingAs($this->admin);

        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $this->employee->id);

        $this->assertEquals(25.0, (float)data_get($empItem, 'paid_days'));
        $this->assertEquals(18833.34, (float)data_get($empItem, 'net_pay'));
    }

    public function test_new_hire_supplementary_base_item_zero_corrections_retains_exact_values()
    {
        $this->actingAs($this->admin);

        $newHireEmp = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => 1,
            'employee_code' => 'NH-TEST-' . rand(100, 999),
            'pan_number' => 'PAN' . rand(10000, 99999) . 'B',
            'aadhaar_number' => '1234' . rand(10000000, 99999999),
            'bank_account_number' => '1234' . rand(100000, 999999),
            'status' => 'active',
        ]);

        $suppRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month,
            'parent_run_id' => $this->lockedRun->id,
            'status' => 'draft',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $suppRun->id,
            'employee_id' => $newHireEmp->id,
            'paid_days' => 15.0,
            'lop_days' => 0.0,
            'basic_pay' => 10000.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => 10000.00,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 9000.00,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'is_excluded' => false,
            'is_correction' => false, // New-hire base item
        ]);
        $suppRun->update(['status' => 'locked']);

        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $newHireEmp->id);

        $this->assertEquals(15.0, (float)data_get($empItem, 'paid_days'));
        $this->assertEquals(9000.00, (float)data_get($empItem, 'net_pay'));
    }

    public function test_index_payslips_returns_consolidated_totals_not_raw_deltas()
    {
        $this->actingAs($this->admin);

        $service = app(PayrollCorrectionService::class);
        $preview = $service->calculateCorrectionPreview($this->employee, $this->lockedRun, 30.0, 0.0);
        $service->applyCorrection($this->employee, $this->lockedRun, $preview, 'Payslips test correction');

        // Lock the supplementary run so indexPayslips includes it
        $suppRun = PayrollRun::where('parent_run_id', $this->lockedRun->id)->where('status', 'draft')->first();
        if ($suppRun) {
            $suppRun->update(['status' => 'locked', 'locked_at' => now()]);
        }

        $response = $this->get(route('payroll.payslips', [
            'client_id' => $this->client->id,
            'payroll_month' => $this->lockedRun->payroll_month
        ]));

        $response->assertStatus(200);
        $itemsProp = $response->viewData('page')['props']['items'];
        $itemList = is_array($itemsProp) && isset($itemsProp['data']) ? $itemsProp['data'] : (is_object($itemsProp) && method_exists($itemsProp, 'items') ? $itemsProp->items() : $itemsProp);
        $empItem = collect($itemList)->firstWhere('employee_id', $this->employee->id);

        // Consolidated net pay should be 23000.00 (20833.34 + 4166.66 delta), NOT raw delta 4166.66!
        $this->assertEquals(30.0, (float)data_get($empItem, 'paid_days'));
        $this->assertEquals(23000.00, (float)data_get($empItem, 'net_pay'));
    }

    public function test_excluded_parent_employee_processed_in_supplementary_clears_exclusion()
    {
        $this->actingAs($this->admin);

        $excludedEmp = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => 1,
            'employee_code' => 'EX-TEST-' . rand(100, 999),
            'pan_number' => 'PAN' . rand(10000, 99999) . 'C',
            'aadhaar_number' => '1234' . rand(10000000, 99999999),
            'bank_account_number' => '1234' . rand(100000, 999999),
            'status' => 'active',
        ]);

        $parentRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-10-01',
            'status' => 'draft',
        ]);

        // Excluded in parent run
        PayrollRunItem::create([
            'payroll_run_id' => $parentRun->id,
            'employee_id' => $excludedEmp->id,
            'paid_days' => 0.0,
            'lop_days' => 0.0,
            'basic_pay' => 0.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => 0.00,
            'employee_pf' => 0.00,
            'employee_esi' => 0.00,
            'professional_tax' => 0.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 0.00,
            'employer_pf' => 0.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'is_excluded' => true,
            'exclusion_reason' => 'Incomplete bank details',
        ]);
        $parentRun->update(['status' => 'locked']);

        // Processed in supplementary run
        $suppRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => $parentRun->payroll_month,
            'parent_run_id' => $parentRun->id,
            'status' => 'draft',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $suppRun->id,
            'employee_id' => $excludedEmp->id,
            'paid_days' => 30.0,
            'lop_days' => 0.0,
            'basic_pay' => 20000.00,
            'hra' => 0.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 0.00,
            'other_additions' => 0.00,
            'gross_total' => 20000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 0.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 0.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 0.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 18000.00,
            'employer_pf' => 1950.00,
            'employer_esi' => 0.00,
            'attendance_source' => 'live_punch',
            'is_excluded' => false,
        ]);
        $suppRun->update(['status' => 'locked']);

        $response = $this->get(route('payroll.approval', [
            'client_id' => $this->client->id,
            'payroll_month' => $parentRun->payroll_month
        ]));

        $response->assertStatus(200);
        $items = $response->viewData('page')['props']['items'];
        $empItem = collect($items)->firstWhere('employee_id', $excludedEmp->id);

        $this->assertFalse((bool)data_get($empItem, 'is_excluded'));
        $this->assertNull(data_get($empItem, 'exclusion_reason'));
        $this->assertEquals(30.0, (float)data_get($empItem, 'paid_days'));
    }
}
