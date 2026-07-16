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
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\EmployeeDocument;
use App\Services\InvoiceGenerationService;
use App\Services\MarginReconciliationService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InvoicingGSTTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $markupClient;
    protected $fixedFeeClient;
    protected $branchMH;   // Maharashtra (27) — same state as agency
    protected $branchKA;   // Karnataka (29)  — different state
    protected $branchMH2;  // Maharashtra branch for fixed-fee client
    protected $empMH;      // Employee in MH branch (markup client)
    protected $empKA;      // Employee in KA branch (markup client)
    protected $empFixed;   // Employee for fixed-fee client
    protected $empExcluded; // Excluded employee (markup client, MH branch)
    protected $empPF;      // Canonical PF check employee

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        // Seed the agency_gstin setting (state code 27 = Maharashtra)
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_gstin'],
            ['value' => '27AABCM1234N1ZQ', 'type' => 'string', 'is_locked' => false,
             'created_at' => now(), 'updated_at' => now()]
        );

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        // ── CLIENT 1: Markup billing, MH state ──
        $this->markupClient = Client::factory()->create([
            'status' => 'active',
            'billing_model' => 'markup',
            'markup_percentage' => 10.00,
            'pt_state' => 'Maharashtra',
            'gstin' => '27AABCT1234L1ZQ', // MH parent GSTIN
        ]);

        // MH Branch — same state as agency (27)
        $this->branchMH = ClientBranch::create([
            'client_id' => $this->markupClient->id,
            'branch_name' => 'Mumbai Office',
            'state' => 'Maharashtra',
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        // KA Branch — different state from agency (29)
        $this->branchKA = ClientBranch::create([
            'client_id' => $this->markupClient->id,
            'branch_name' => 'Bangalore Office',
            'state' => 'Karnataka',
            'gstin' => '29AABCT1234L1ZR',
        ]);

        // ── CLIENT 2: Fixed per candidate billing ──
        $this->fixedFeeClient = Client::factory()->create([
            'status' => 'active',
            'billing_model' => 'fixed_per_candidate',
            'fixed_fee_amount' => 2500.00,
            'pt_state' => 'Maharashtra',
            'gstin' => '27AABCF5678M1ZA',
        ]);

        $this->branchMH2 = ClientBranch::create([
            'client_id' => $this->fixedFeeClient->id,
            'branch_name' => 'Pune Office',
            'state' => 'Maharashtra',
            'gstin' => '27AABCF5678M1ZA',
        ]);

        // ── EMPLOYEES ──
        $baseEmployee = [
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2024-01-01',
            'employment_model' => 'eor',
            'prior_employment_flag' => 0,
            'residential_address' => '123 Test St',
            'bank_account_number' => '1111111111',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'uan_mode' => 'new',
            'status' => 'active',
            'conveyance' => 0, 'da' => 0, 'medical_allowance' => 0,
            'special_allowance' => 0, 'other_additions' => 0,
            'tds_regime' => 'new', 'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30', 'declarations_accepted' => 1,
            'pf_applicable' => true, 'esi_applicable' => false,
            'pt_applicable' => true, 'lwf_applicable' => false,
        ];

        // Employee MH (markup client, Maharashtra branch)
        $this->empMH = Employee::create(array_merge($baseEmployee, [
            'client_id' => $this->markupClient->id,
            'branch_id' => $this->branchMH->id,
            'full_name' => 'Employee MH',
            'personal_email' => 'emh@example.com',
            'phone_number' => '9900110011',
            'designation' => 'Developer',
            'account_holder_name' => 'Employee MH',
            'pan_number' => 'ABCDE1111A',
            'employee_code' => 'TEC-MH1',
            'basic_pay' => 20000, 'hra' => 8000,
            'bank_account_number' => '1111111111',
        ]));

        // Employee KA (markup client, Karnataka branch)
        $this->empKA = Employee::create(array_merge($baseEmployee, [
            'client_id' => $this->markupClient->id,
            'branch_id' => $this->branchKA->id,
            'full_name' => 'Employee KA',
            'personal_email' => 'eka@example.com',
            'phone_number' => '9900110022',
            'designation' => 'Designer',
            'account_holder_name' => 'Employee KA',
            'pan_number' => 'ABCDE2222B',
            'employee_code' => 'TEC-KA1',
            'basic_pay' => 18000, 'hra' => 7000,
            'bank_account_number' => '2222222222',
        ]));

        // Employee Fixed (fixed-fee client, Pune branch)
        $this->empFixed = Employee::create(array_merge($baseEmployee, [
            'client_id' => $this->fixedFeeClient->id,
            'branch_id' => $this->branchMH2->id,
            'full_name' => 'Employee Fixed',
            'personal_email' => 'efix@example.com',
            'phone_number' => '9900110033',
            'designation' => 'Accountant',
            'account_holder_name' => 'Employee Fixed',
            'pan_number' => 'ABCDE3333C',
            'employee_code' => 'TEC-FX1',
            'basic_pay' => 22000, 'hra' => 9000,
            'bank_account_number' => '3333333333',
        ]));

        // Employee Excluded (markup client, MH branch — missing bank details)
        $this->empExcluded = Employee::create(array_merge($baseEmployee, [
            'client_id' => $this->markupClient->id,
            'branch_id' => $this->branchMH->id,
            'full_name' => 'Employee Excluded',
            'personal_email' => 'eex@example.com',
            'phone_number' => '9900110044',
            'designation' => 'Tester',
            'account_holder_name' => '',
            'pan_number' => 'ABCDE4444D',
            'employee_code' => 'TEC-EX1',
            'basic_pay' => 16000, 'hra' => 6000,
            'bank_account_number' => '',
            'bank_ifsc' => '',
            'bank_name' => '',
            'bank_branch' => '',
        ]));

        // Canonical PF employee (TEC-088)
        $this->empPF = Employee::create(array_merge($baseEmployee, [
            'client_id' => $this->markupClient->id,
            'branch_id' => $this->branchMH->id,
            'full_name' => 'Canonical PF Employee',
            'personal_email' => 'pf@example.com',
            'phone_number' => '9900110055',
            'designation' => 'Manager',
            'account_holder_name' => 'Canonical PF',
            'pan_number' => 'ABCDE5555E',
            'employee_code' => 'TEC-088',
            'basic_pay' => 15000, 'hra' => 5000,
            'bank_account_number' => '5555555555',
        ]));

        // Bypass document gates for all employees
        foreach ([$this->empMH, $this->empKA, $this->empFixed, $this->empExcluded, $this->empPF] as $emp) {
            foreach ($emp->required_document_types as $type) {
                EmployeeDocument::create([
                    'employee_id' => $emp->id,
                    'document_type' => $type,
                    'file_path' => 'test.pdf',
                    'status' => 'verified',
                ]);
            }
        }
    }

    /**
     * Helper to seed full-month attendance records.
     */
    private function seedAttendance($employeeId, $monthStr)
    {
        $start = Carbon::parse($monthStr)->startOfMonth();
        $end = Carbon::parse($monthStr)->endOfMonth();
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if (!$date->isWeekend()) {
                DB::table('attendance_records')->insert([
                    'employee_id' => $employeeId,
                    'attendance_date' => $date->toDateString(),
                    'status' => 'present',
                    'source' => 'live_punch',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Helper to run payroll for an employee and return the result.
     */
    private function runPayrollForEmployee(Employee $employee, PayrollRun $run): array
    {
        $attendanceService = app(\App\Services\AttendanceResolutionService::class);
        $calculator = app(\App\Services\MonthlyPayrollCalculator::class);

        $monthStart = Carbon::parse($run->payroll_month)->startOfMonth()->toDateString();
        $monthEnd = Carbon::parse($run->payroll_month)->endOfMonth()->toDateString();
        $attendanceService->resolveForEmployee($employee, $monthStart, $monthEnd);

        return $calculator->calculateForEmployee($employee, $run);
    }

    /**
     * Helper to insert an excluded payroll_run_item.
     */
    private function insertExcludedItem(PayrollRun $run, Employee $employee, string $reason)
    {
        DB::table('payroll_run_items')->insert([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 0, 'lop_days' => 0,
            'basic_pay' => 0, 'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 0, 'employee_pf' => 0, 'employee_esi' => 0,
            'professional_tax' => 0, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 0,
            'employer_pf' => 0, 'employer_esi' => 0, 'employer_lwf' => 0,
            'is_excluded' => true, 'exclusion_reason' => $reason,
            'attendance_source' => 'live_punch',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 1: Branch-wise GST Types (CGST/SGST vs IGST)
    // ═══════════════════════════════════════════════════════════════════

    public function test_branch_wise_gst_types()
    {
        $month = '2026-06-01';
        $this->seedAttendance($this->empMH->id, $month);
        $this->seedAttendance($this->empKA->id, $month);

        // Create and process payroll run
        $run = PayrollRun::create([
            'client_id' => $this->markupClient->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calcMH = $this->runPayrollForEmployee($this->empMH, $run);
        $calcKA = $this->runPayrollForEmployee($this->empKA, $run);

        $totalGross = $calcMH['gross_total'] + $calcKA['gross_total'];
        $totalNet = $calcMH['net_pay'] + $calcKA['net_pay'];
        $totalStatutory = ($calcMH['employer_statutory_cost'] ?? 0) + ($calcKA['employer_statutory_cost'] ?? 0);

        $run->update([
            'total_employees_processed' => 2,
            'total_gross_earnings' => $totalGross,
            'total_net_disbursement' => $totalNet,
            'total_employer_statutory_cost' => $totalStatutory,
        ]);

        // Approve then lock
        $this->actingAs($this->admin)->post("/payroll/{$run->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$run->id}/lock");

        $run->refresh();
        $this->assertEquals('locked', $run->status);

        // Verify invoices were created
        $invoices = Invoice::where('payroll_run_id', $run->id)->get();
        $this->assertCount(2, $invoices);

        // MH branch invoice: same state as agency (27) → cgst_sgst
        $mhInvoice = $invoices->where('branch_id', $this->branchMH->id)->first();
        $this->assertNotNull($mhInvoice);
        $this->assertEquals('cgst_sgst', $mhInvoice->gst_type);
        $this->assertEquals('Maharashtra', $mhInvoice->place_of_supply_state);

        // KA branch invoice: different state (29) → igst
        $kaInvoice = $invoices->where('branch_id', $this->branchKA->id)->first();
        $this->assertNotNull($kaInvoice);
        $this->assertEquals('igst', $kaInvoice->gst_type);
        $this->assertEquals('Karnataka', $kaInvoice->place_of_supply_state);

        // GST percentages: 18% of agency_service_fee
        $this->assertEquals(
            round($mhInvoice->agency_service_fee * 0.18, 2),
            (float) $mhInvoice->gst_amount
        );
        $this->assertEquals(
            round($kaInvoice->agency_service_fee * 0.18, 2),
            (float) $kaInvoice->gst_amount
        );

        echo "\n--- TEST 1: Branch-wise GST Types ---\n";
        echo "MH Invoice: gst_type={$mhInvoice->gst_type}, POS={$mhInvoice->place_of_supply_state}, "
            . "gross={$mhInvoice->gross_salary_passthrough}, fee={$mhInvoice->agency_service_fee}, "
            . "gst={$mhInvoice->gst_amount}, total={$mhInvoice->grand_total}\n";
        echo "KA Invoice: gst_type={$kaInvoice->gst_type}, POS={$kaInvoice->place_of_supply_state}, "
            . "gross={$kaInvoice->gross_salary_passthrough}, fee={$kaInvoice->agency_service_fee}, "
            . "gst={$kaInvoice->gst_amount}, total={$kaInvoice->grand_total}\n";
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 2: Markup vs Fixed-Fee Billing Models
    // ═══════════════════════════════════════════════════════════════════

    public function test_billing_model_service_fee_calculation()
    {
        $month = '2026-06-01';
        $this->seedAttendance($this->empMH->id, $month);
        $this->seedAttendance($this->empFixed->id, $month);

        // ── MARKUP CLIENT RUN ──
        $markupRun = PayrollRun::create([
            'client_id' => $this->markupClient->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 0, 'total_employees_excluded' => 0,
            'total_gross_earnings' => 0, 'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calcMarkup = $this->runPayrollForEmployee($this->empMH, $markupRun);

        $markupRun->update([
            'total_employees_processed' => 1,
            'total_gross_earnings' => $calcMarkup['gross_total'],
            'total_net_disbursement' => $calcMarkup['net_pay'],
            'total_employer_statutory_cost' => $calcMarkup['employer_statutory_cost'] ?? 0,
        ]);

        $this->actingAs($this->admin)->post("/payroll/{$markupRun->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$markupRun->id}/lock");

        $markupInvoice = Invoice::where('payroll_run_id', $markupRun->id)->first();
        $this->assertNotNull($markupInvoice);

        // Markup: 10% of gross
        $expectedMarkupFee = round($calcMarkup['gross_total'] * 0.10, 2);
        $this->assertEquals($expectedMarkupFee, (float) $markupInvoice->agency_service_fee);

        // ── FIXED-FEE CLIENT RUN ──
        $fixedRun = PayrollRun::create([
            'client_id' => $this->fixedFeeClient->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 0, 'total_employees_excluded' => 0,
            'total_gross_earnings' => 0, 'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calcFixed = $this->runPayrollForEmployee($this->empFixed, $fixedRun);

        $fixedRun->update([
            'total_employees_processed' => 1,
            'total_gross_earnings' => $calcFixed['gross_total'],
            'total_net_disbursement' => $calcFixed['net_pay'],
            'total_employer_statutory_cost' => $calcFixed['employer_statutory_cost'] ?? 0,
        ]);

        $this->actingAs($this->admin)->post("/payroll/{$fixedRun->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$fixedRun->id}/lock");

        $fixedInvoice = Invoice::where('payroll_run_id', $fixedRun->id)->first();
        $this->assertNotNull($fixedInvoice);

        // Fixed per candidate: ₹2500 flat per employee
        $this->assertEquals(2500.00, (float) $fixedInvoice->agency_service_fee);

        echo "\n--- TEST 2: Billing Models ---\n";
        echo "Markup client: gross={$markupInvoice->gross_salary_passthrough}, "
            . "fee={$markupInvoice->agency_service_fee} (10% of gross)\n";
        echo "Fixed-fee client: gross={$fixedInvoice->gross_salary_passthrough}, "
            . "fee={$fixedInvoice->agency_service_fee} (₹2500 flat)\n";
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 3: Excluded Employee Validation
    // ═══════════════════════════════════════════════════════════════════

    public function test_excluded_employee_not_in_invoice()
    {
        $month = '2026-06-01';
        $this->seedAttendance($this->empMH->id, $month);
        $this->seedAttendance($this->empExcluded->id, $month);

        $run = PayrollRun::create([
            'client_id' => $this->markupClient->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 0, 'total_employees_excluded' => 0,
            'total_gross_earnings' => 0, 'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        // Process empMH normally
        $calcMH = $this->runPayrollForEmployee($this->empMH, $run);

        // Insert excluded item for empExcluded
        $this->insertExcludedItem($run, $this->empExcluded, 'Missing bank details');

        $run->update([
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => $calcMH['gross_total'],
            'total_net_disbursement' => $calcMH['net_pay'],
            'total_employer_statutory_cost' => $calcMH['employer_statutory_cost'] ?? 0,
        ]);

        $this->actingAs($this->admin)->post("/payroll/{$run->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$run->id}/lock");

        // Verify invoice
        $invoice = Invoice::where('payroll_run_id', $run->id)->first();
        $this->assertNotNull($invoice);

        // gross_salary_passthrough should ONLY include empMH
        $this->assertEquals(round($calcMH['gross_total'], 2), (float) $invoice->gross_salary_passthrough);

        // Invoice line items should NOT include the excluded employee
        $lineItems = InvoiceLineItem::where('invoice_id', $invoice->id)->get();
        $this->assertCount(1, $lineItems);
        $this->assertEquals($this->empMH->id, $lineItems->first()->employee_id);
        $this->assertNotContains($this->empExcluded->id, $lineItems->pluck('employee_id')->toArray());

        echo "\n--- TEST 3: Excluded Employee Validation ---\n";
        echo "Invoice line items count: {$lineItems->count()} (expected 1)\n";
        echo "Excluded employee {$this->empExcluded->employee_code} absent from invoice: YES\n";
        echo "Invoice gross: {$invoice->gross_salary_passthrough} (matches empMH gross: {$calcMH['gross_total']})\n";
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 4: Margin Formula Reconciliation (Independent Check)
    // ═══════════════════════════════════════════════════════════════════

    public function test_margin_reconciliation_passes()
    {
        $month = '2026-06-01';
        $this->seedAttendance($this->empMH->id, $month);
        $this->seedAttendance($this->empKA->id, $month);

        $run = PayrollRun::create([
            'client_id' => $this->markupClient->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 0, 'total_employees_excluded' => 0,
            'total_gross_earnings' => 0, 'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calcMH = $this->runPayrollForEmployee($this->empMH, $run);
        $calcKA = $this->runPayrollForEmployee($this->empKA, $run);

        $run->update([
            'total_employees_processed' => 2,
            'total_gross_earnings' => $calcMH['gross_total'] + $calcKA['gross_total'],
            'total_net_disbursement' => $calcMH['net_pay'] + $calcKA['net_pay'],
            'total_employer_statutory_cost' => ($calcMH['employer_statutory_cost'] ?? 0) + ($calcKA['employer_statutory_cost'] ?? 0),
        ]);

        $this->actingAs($this->admin)->post("/payroll/{$run->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$run->id}/lock");

        // Run the reconciliation service
        $reconciler = app(MarginReconciliationService::class);
        $result = $reconciler->reconcileMargin($run->fresh());

        $this->assertTrue($result['check_a']['passed'], 'Check A (Invoice Line Total) failed');
        $this->assertTrue($result['check_b']['passed'], 'Check B (Agency Margin) failed');
        $this->assertTrue($result['reconciled'], 'Overall reconciliation failed');

        echo "\n--- TEST 4: Margin Reconciliation ---\n";
        echo "Check A: Invoice line total = {$result['check_a']['invoice_side_line_total']}, "
            . "Payroll side = {$result['check_a']['payroll_side_line_total']} → "
            . ($result['check_a']['passed'] ? 'PASS' : 'FAIL') . "\n";
        echo "Check B: Margin (invoice) = {$result['check_b']['margin_invoice_side']}, "
            . "Margin (payroll) = {$result['check_b']['margin_payroll_side']} → "
            . ($result['check_b']['passed'] ? 'PASS' : 'FAIL') . "\n";
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 5: Parent + Supplementary Run Invoice Merge
    // ═══════════════════════════════════════════════════════════════════

    public function test_supplementary_run_merges_into_parent_invoice()
    {
        $month = '2026-06-01';
        $this->seedAttendance($this->empMH->id, $month);
        $this->seedAttendance($this->empExcluded->id, $month);

        // ── PARENT RUN ──
        $parentRun = PayrollRun::create([
            'client_id' => $this->markupClient->id,
            'payroll_month' => $month,
            'status' => 'draft',
            'total_employees_processed' => 0, 'total_employees_excluded' => 0,
            'total_gross_earnings' => 0, 'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
        ]);

        $calcMH = $this->runPayrollForEmployee($this->empMH, $parentRun);
        $this->insertExcludedItem($parentRun, $this->empExcluded, 'Missing bank details');

        $parentRun->update([
            'total_employees_processed' => 1,
            'total_employees_excluded' => 1,
            'total_gross_earnings' => $calcMH['gross_total'],
            'total_net_disbursement' => $calcMH['net_pay'],
            'total_employer_statutory_cost' => $calcMH['employer_statutory_cost'] ?? 0,
        ]);

        // Approve and lock parent → creates invoice with empMH only
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/lock");

        // Verify parent invoice exists with 1 line item
        $parentInvoice = Invoice::where('payroll_run_id', $parentRun->id)
            ->where('branch_id', $this->branchMH->id)
            ->first();
        $this->assertNotNull($parentInvoice);
        $this->assertCount(1, InvoiceLineItem::where('invoice_id', $parentInvoice->id)->get());

        $originalGross = (float) $parentInvoice->gross_salary_passthrough;
        $originalFee = (float) $parentInvoice->agency_service_fee;

        // ── RESOLVE EXCLUSION & RUN SUPPLEMENTARY ──
        $this->empExcluded->update([
            'bank_account_number' => '4444444444',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => 'Employee Excluded',
        ]);

        $this->actingAs($this->admin)->post("/payroll/{$parentRun->id}/supplementary");

        $suppRun = PayrollRun::where('parent_run_id', $parentRun->id)->first();
        $this->assertNotNull($suppRun);

        // Approve and lock supplementary → should MERGE into parent invoice
        $suppRun->update([
            'total_employees_processed' => $suppRun->total_employees_processed,
            'total_gross_earnings' => $suppRun->total_gross_earnings,
            'total_net_disbursement' => $suppRun->total_net_disbursement,
            'total_employer_statutory_cost' => $suppRun->total_employer_statutory_cost,
        ]);

        // Need to approve and lock
        $this->actingAs($this->admin)->post("/payroll/{$suppRun->id}/approve");
        $this->actingAs($this->admin)->post("/payroll/{$suppRun->id}/lock");

        // ── ASSERT MERGE BEHAVIOR ──
        // Still exactly 1 invoice for this branch (merged, not duplicated)
        $branchInvoices = Invoice::where('payroll_run_id', $parentRun->id)
            ->where('branch_id', $this->branchMH->id)
            ->get();
        $this->assertCount(1, $branchInvoices, 'Expected exactly 1 merged invoice for MH branch');

        $mergedInvoice = $branchInvoices->first();

        // Line items should now include BOTH empMH and empExcluded
        $lineItems = InvoiceLineItem::where('invoice_id', $mergedInvoice->id)->get();
        $this->assertCount(2, $lineItems, 'Expected 2 line items after merge');
        $this->assertContains($this->empMH->id, $lineItems->pluck('employee_id')->toArray());
        $this->assertContains($this->empExcluded->id, $lineItems->pluck('employee_id')->toArray());

        // Merged gross should be greater than original (empMH only)
        $this->assertGreaterThan($originalGross, (float) $mergedInvoice->gross_salary_passthrough);
        $this->assertGreaterThan($originalFee, (float) $mergedInvoice->agency_service_fee);

        echo "\n--- TEST 5: Parent + Supplementary Invoice Merge ---\n";
        echo "Invoices for MH branch: {$branchInvoices->count()} (expected 1 — merged)\n";
        echo "Line items: {$lineItems->count()} (expected 2 — empMH + empExcluded recovered)\n";
        echo "Original gross (parent only): {$originalGross}\n";
        echo "Merged gross (parent + supp): {$mergedInvoice->gross_salary_passthrough}\n";
        echo "Original fee: {$originalFee}\n";
        echo "Merged fee: {$mergedInvoice->agency_service_fee}\n";
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 6: Canonical PF Check
    // ═══════════════════════════════════════════════════════════════════

    public function test_canonical_pf_check()
    {
        $emp = Employee::where('employee_code', 'TEC-088')->first();
        $this->assertNotNull($emp);

        $expectedPf = min($emp->basic_pay, 15000) * 0.13;
        $this->assertEquals(1950.00, $expectedPf);
        $this->assertEquals($expectedPf, $emp->employer_pf_monthly);
    }
}
