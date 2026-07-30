<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Services\PayrollCorrectionService;
use Illuminate\Http\UploadedFile;

class BatchPayrollCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected array $employees = [];
    protected PayrollRun $lockedRun;

    protected function setUp(): void
    {
        parent::setUp();
        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-08-01'));

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->client = Client::factory()->create(['company_name' => 'Batch Client', 'weekly_off_pattern' => 'sat,sun']);
        \App\Models\ClientBranch::factory()->create(['client_id' => $this->client->id]);

        for ($i = 1; $i <= 5; $i++) {
            $emp = Employee::factory()->create([
                'client_id' => $this->client->id,
                'branch_id' => 1,
                'employee_code' => "EMP-BATCH-{$i}",
                'pan_number' => "ABCDE000" . $i . "F",
                'aadhaar_number' => "10000000000" . $i,
                'bank_account_number' => "99900000" . $i,
                'basic_pay' => 20000.00,
                'hra' => 5000.00,
                'pf_applicable' => true,
                'eps_applicable' => true,
                'status' => 'active',
            ]);
            $this->employees[] = $emp;
        }

        $this->lockedRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 125000.00,
            'total_net_disbursement' => 115000.00,
            'total_employer_statutory_cost' => 9750.00,
        ]);

        foreach ($this->employees as $emp) {
            PayrollRunItem::create([
                'payroll_run_id' => $this->lockedRun->id,
                'employee_id' => $emp->id,
                'paid_days' => 30.0,
                'lop_days' => 0.0,
                'basic_pay' => 20000.00,
                'hra' => 5000.00,
                'conveyance' => 0.00,
                'da' => 0.00,
                'medical_allowance' => 0.00,
                'special_allowance' => 0.00,
                'other_additions' => 0.00,
                'gross_total' => 25000.00,
                'employee_pf' => 1800.00,
                'employee_esi' => 0.00,
                'professional_tax' => 200.00,
                'lwf_deduction' => 0.00,
                'lop_deduction' => 0.00,
                'tds_deduction' => 0.00,
                'loan_emi_deduction' => 0.00,
                'net_pay' => 23000.00,
                'employer_pf' => 1950.00,
                'employer_epf' => 550.50,
                'employer_eps' => 1249.50,
                'employer_esi' => 0.00,
                'is_excluded' => false,
                'attendance_source' => 'live_punch',
            ]);
        }

        // Lock the payroll run after creating initial items
        \DB::table('payroll_runs')->where('id', $this->lockedRun->id)->update([
            'status' => 'locked',
            'locked_at' => now(),
        ]);
        $this->lockedRun->refresh();
    }

    public function test_batch_correction_updates_existing_individual_correction_without_duplicating()
    {
        $this->actingAs($this->admin);

        $service = app(PayrollCorrectionService::class);
        $emp1 = $this->employees[0];
        $emp2 = $this->employees[1];

        // 1. Create individual correction for Emp 1
        $preview1 = $service->calculateCorrectionPreview($emp1, $this->lockedRun, 28.0, 2.0);
        $service->applyCorrection($emp1, $this->lockedRun, $preview1, 'Initial single correction');

        $suppRun = PayrollRun::where('parent_run_id', $this->lockedRun->id)->where('status', 'draft')->firstOrFail();
        $this->assertEquals(1, PayrollRunItem::where('payroll_run_id', $suppRun->id)->count());

        // 2. Run batch correction containing Emp 1 and Emp 2
        $itemsPayload = [
            [
                'employee_id' => $emp1->id,
                'corrected_paid_days' => 30.0,
                'corrected_lop_days' => 0.0,
                'reason' => 'Revised via batch',
            ],
            [
                'employee_id' => $emp2->id,
                'corrected_paid_days' => 30.0,
                'corrected_lop_days' => 0.0,
                'reason' => 'New batch correction',
            ]
        ];

        $service->applyBatchCorrection($this->lockedRun, $itemsPayload, 'Global batch reason');

        // Assert Emp 1 item was UPDATED in place and total items in supp run is 2 (zero duplication)
        $this->assertEquals(2, PayrollRunItem::where('payroll_run_id', $suppRun->id)->count());
        $this->assertEquals(1, PayrollRunItem::where('payroll_run_id', $suppRun->id)->where('employee_id', $emp1->id)->count());

        $emp1Item = PayrollRunItem::where('payroll_run_id', $suppRun->id)->where('employee_id', $emp1->id)->first();
        $this->assertEquals('Revised via batch', $emp1Item->correction_reason);
    }

    public function test_batch_correction_file_upload_prefills_preview_without_writing_to_database()
    {
        $this->actingAs($this->admin);

        $csvContent = "employee_code,days_present,days_lop,reason\n";
        $csvContent .= "EMP-BATCH-1,30,0,File row 1\n";
        $csvContent .= "EMP-BATCH-2,30,0,File row 2\n";

        $file = UploadedFile::fake()->createWithContent('corrections.csv', $csvContent);

        $itemsBefore = PayrollRunItem::count();

        $response = $this->post(route('payroll.correction.batch-import'), [
            'parent_run_id' => $this->lockedRun->id,
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonCount(2, 'items');

        $itemsAfter = PayrollRunItem::count();
        $this->assertEquals($itemsBefore, $itemsAfter, "Import endpoint must NOT write any rows to the database.");
    }

    public function test_file_sourced_rows_and_manually_edited_rows_submit_through_identical_validation()
    {
        $this->actingAs($this->admin);

        $payload = [
            'parent_run_id' => $this->lockedRun->id,
            'reason' => 'Global batch submit',
            'items' => [
                // Row 1 (simulated file-sourced)
                [
                    'employee_id' => $this->employees[0]->id,
                    'corrected_paid_days' => 30,
                    'corrected_lop_days' => 0,
                    'reason' => 'File imported reason',
                ],
                // Row 2 (simulated manually edited)
                [
                    'employee_id' => $this->employees[1]->id,
                    'corrected_paid_days' => 28,
                    'corrected_lop_days' => 2,
                    'reason' => 'Manually typed reason',
                ],
            ]
        ];

        $response = $this->post(route('payroll.correction.batch-store'), $payload);
        $response->assertRedirect();

        $suppRun = PayrollRun::where('parent_run_id', $this->lockedRun->id)->where('status', 'draft')->firstOrFail();
        $this->assertEquals(2, PayrollRunItem::where('payroll_run_id', $suppRun->id)->count());
    }

    public function test_batch_correction_produces_identical_results_to_individual_corrections()
    {
        $this->actingAs($this->admin);

        $service = app(PayrollCorrectionService::class);

        // Run A: 3 individual corrections
        $emp1 = $this->employees[0];
        $emp2 = $this->employees[1];
        $emp3 = $this->employees[2];

        $p1 = $service->calculateCorrectionPreview($emp1, $this->lockedRun, 30, 0);
        $itemA1 = $service->applyCorrection($emp1, $this->lockedRun, $p1, 'Indiv 1');

        $p2 = $service->calculateCorrectionPreview($emp2, $this->lockedRun, 28, 2);
        $itemA2 = $service->applyCorrection($emp2, $this->lockedRun, $p2, 'Indiv 2');

        $p3 = $service->calculateCorrectionPreview($emp3, $this->lockedRun, 27, 3);
        $itemA3 = $service->applyCorrection($emp3, $this->lockedRun, $p3, 'Indiv 3');

        $suppRunA = PayrollRun::where('parent_run_id', $this->lockedRun->id)->first();
        $itemsA = PayrollRunItem::where('payroll_run_id', $suppRunA->id)->orderBy('employee_id')->get();

        // Clear supp run A
        PayrollRunItem::where('payroll_run_id', $suppRunA->id)->delete();
        $suppRunA->delete();

        // Run B: Batch correction for same 3 employees
        $batchPayload = [
            ['employee_id' => $emp1->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0, 'reason' => 'Indiv 1'],
            ['employee_id' => $emp2->id, 'corrected_paid_days' => 28, 'corrected_lop_days' => 2, 'reason' => 'Indiv 2'],
            ['employee_id' => $emp3->id, 'corrected_paid_days' => 27, 'corrected_lop_days' => 3, 'reason' => 'Indiv 3'],
        ];

        $suppRunB = $service->applyBatchCorrection($this->lockedRun, $batchPayload, 'Batch Reason');
        $itemsB = PayrollRunItem::where('payroll_run_id', $suppRunB->id)->orderBy('employee_id')->get();

        $this->assertEquals(count($itemsA), count($itemsB));

        for ($i = 0; $i < count($itemsA); $i++) {
            $a = $itemsA[$i]->toArray();
            $b = $itemsB[$i]->toArray();

            // Ignore timestamps and IDs
            unset($a['id'], $a['payroll_run_id'], $a['created_at'], $a['updated_at']);
            unset($b['id'], $b['payroll_run_id'], $b['created_at'], $b['updated_at']);

            $this->assertEquals($a, $b, "Batch item #{$i} must be component-by-component identical to single correction item.");
        }
    }

    public function test_batch_correction_creates_single_draft_supplementary_run()
    {
        $this->actingAs($this->admin);

        $payload = [
            'parent_run_id' => $this->lockedRun->id,
            'reason' => 'Single supp run test',
            'items' => [
                ['employee_id' => $this->employees[0]->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0],
                ['employee_id' => $this->employees[1]->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0],
                ['employee_id' => $this->employees[2]->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0],
                ['employee_id' => $this->employees[3]->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0],
            ]
        ];

        $this->post(route('payroll.correction.batch-store'), $payload);

        $suppRuns = PayrollRun::where('parent_run_id', $this->lockedRun->id)->get();
        $this->assertEquals(1, $suppRuns->count(), "Batch correction must create exactly 1 supplementary run.");
        $this->assertEquals(4, PayrollRunItem::where('payroll_run_id', $suppRuns->first()->id)->count());
    }

    public function test_selective_batch_correction_omits_unselected_employees()
    {
        $this->actingAs($this->admin);

        $payload = [
            'parent_run_id' => $this->lockedRun->id,
            'reason' => 'Selective correction',
            'items' => [
                ['employee_id' => $this->employees[0]->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0],
                ['employee_id' => $this->employees[2]->id, 'corrected_paid_days' => 30, 'corrected_lop_days' => 0],
            ]
        ];

        $this->post(route('payroll.correction.batch-store'), $payload);

        $suppRun = PayrollRun::where('parent_run_id', $this->lockedRun->id)->firstOrFail();
        $itemEmpIds = PayrollRunItem::where('payroll_run_id', $suppRun->id)->pluck('employee_id')->toArray();

        $this->assertContains($this->employees[0]->id, $itemEmpIds);
        $this->assertContains($this->employees[2]->id, $itemEmpIds);
        $this->assertNotContains($this->employees[1]->id, $itemEmpIds);
        $this->assertNotContains($this->employees[3]->id, $itemEmpIds);
    }
}
