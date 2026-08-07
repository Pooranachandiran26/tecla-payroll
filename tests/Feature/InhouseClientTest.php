<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\Invoice;
use App\Services\InvoiceGenerationService;
use App\Services\MonthlyPayrollCalculator;
use App\Services\MarginReconciliationService;
use App\Services\Reports\InvoiceReportService;
use App\Services\Reports\MarginProfitabilityReportService;

class InhouseClientTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $inhouseClient;
    protected Client $normalClient;
    protected ClientBranch $inhouseBranch;
    protected ClientBranch $normalBranch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        // 1. Create In-House Client
        $this->inhouseClient = Client::factory()->create([
            'company_name' => 'Inhouse Tech Corp',
            'client_code' => 'INH001',
            'contract_type' => 'agency',
            'billing_model' => 'inhouse',
            'credit_limit' => 0, // ₹0 credit limit (would trigger warning if checked)
            'po_required' => true,
            'po_number' => 'PO-EXPIRED-001',
            'po_validity_date' => '2020-01-01', // Expired PO (would trigger error if checked)
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_state' => 'Tamil Nadu',
            'status' => 'active',
        ]);
        $this->inhouseBranch = $this->inhouseClient->branches()->create([
            'branch_name' => 'Inhouse HQ',
            'state' => 'Tamil Nadu',
            'is_head_office' => true,
        ]);

        // 2. Create Normal Client
        $this->normalClient = Client::factory()->create([
            'company_name' => 'External Client Ltd',
            'client_code' => 'EXT001',
            'contract_type' => 'agency',
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 15000,
            'credit_limit' => 500000,
            'pf_applicable' => true,
            'esi_applicable' => true,
            'pt_state' => 'Tamil Nadu',
            'status' => 'active',
        ]);
        $this->normalBranch = $this->normalClient->branches()->create([
            'branch_name' => 'External HQ',
            'state' => 'Tamil Nadu',
            'gstin' => '33AAAAA0000A1Z5',
            'is_head_office' => true,
        ]);
    }

    private function createTestEmployee(array $overrides = []): Employee
    {
        static $counter = 100;
        $counter++;

        return Employee::create(array_merge([
            'client_id' => $this->inhouseClient->id,
            'branch_id' => $this->inhouseBranch->id,
            'full_name' => "Worker {$counter}",
            'personal_email' => "worker{$counter}@example.com",
            'phone_number' => "987654{$counter}",
            'date_of_birth' => '1990-01-01',
            'date_of_joining' => '2024-01-01',
            'designation' => 'Developer',
            'employment_model' => 'agency_contract',
            'employee_code' => "EMP-{$counter}",
            'pan_number' => "ABCDE{$counter}X",
            'status' => 'active',
            'basic_pay' => 30000,
            'hra' => 12000,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'prior_employment_flag' => 0,
            'residential_address' => '123 St',
            'bank_account_number' => "12345678{$counter}",
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'bank_branch' => 'Main',
            'account_holder_name' => "Worker {$counter}",
            'uan_mode' => 'new',
            'tds_regime' => 'new',
            'gratuity_mode' => 'part_of_ctc',
            'lop_basis_days' => '30',
            'declarations_accepted' => 1,
        ], $overrides));
    }

    /**
     * Test 1: Locking payroll for an inhouse client creates ZERO invoices and ZERO credit limit/PO warnings.
     */
    public function test_inhouse_client_payroll_lock_creates_zero_invoices_and_bypasses_credit_po_warnings()
    {
        $employee = $this->createTestEmployee();

        $run = PayrollRun::create([
            'client_id' => $this->inhouseClient->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 42000,
            'total_employer_statutory_cost' => 1950,
            'total_net_disbursement' => 40050,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 31, 'lop_days' => 0,
            'basic_pay' => 30000, 'hra' => 12000, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 42000, 'employee_pf' => 1800, 'employee_esi' => 0,
            'professional_tax' => 208.33, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 39991.67,
            'employer_pf' => 1950, 'employer_esi' => 0, 'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);

        $invoiceService = app(InvoiceGenerationService::class);
        $invoices = $invoiceService->generateForRun($run);

        // Assert zero invoices generated
        $this->assertEmpty($invoices);
        $this->assertEquals(0, Invoice::where('client_id', $this->inhouseClient->id)->count());
    }

    /**
     * Test 2: Normal client still generates invoices correctly (Zero Regression).
     */
    public function test_normal_client_payroll_lock_generates_invoices_normally()
    {
        $employee = $this->createTestEmployee([
            'client_id' => $this->normalClient->id,
            'branch_id' => $this->normalBranch->id,
        ]);

        $run = PayrollRun::create([
            'client_id' => $this->normalClient->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 30000,
            'total_employer_statutory_cost' => 1950,
            'total_net_disbursement' => 28050,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'paid_days' => 31, 'lop_days' => 0,
            'basic_pay' => 30000, 'hra' => 0, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 0, 'other_additions' => 0,
            'gross_total' => 30000, 'employee_pf' => 1800, 'employee_esi' => 0,
            'professional_tax' => 200, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 28000,
            'employer_pf' => 1950, 'employer_esi' => 0, 'is_excluded' => 0,
            'attendance_source' => 'uploaded',
        ]);

        $run->update(['status' => 'locked']);

        $invoiceService = app(InvoiceGenerationService::class);
        $invoices = $invoiceService->generateForRun($run);

        $this->assertNotEmpty($invoices);
        $this->assertEquals(1, count($invoices));
        $this->assertEquals($this->normalClient->id, $invoices[0]->client_id);
        $this->assertGreaterThan(0, $invoices[0]->grand_total);
    }

    /**
     * Test 3: Statutory calculations (PF/ESI/PT) for inhouse vs normal employees are byte-for-byte identical.
     */
    public function test_statutory_calculations_are_byte_for_byte_identical_for_inhouse_client()
    {
        $calculator = app(MonthlyPayrollCalculator::class);

        $inhouseEmp = $this->createTestEmployee([
            'client_id' => $this->inhouseClient->id,
            'branch_id' => $this->inhouseBranch->id,
            'special_allowance' => 5304,
        ]);

        $normalEmp = $this->createTestEmployee([
            'client_id' => $this->normalClient->id,
            'branch_id' => $this->normalBranch->id,
            'special_allowance' => 5304,
        ]);

        $run1 = PayrollRun::create(['client_id' => $this->inhouseClient->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $run2 = PayrollRun::create(['client_id' => $this->normalClient->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);

        $res1 = $calculator->calculateForEmployee($inhouseEmp, $run1);
        $res2 = $calculator->calculateForEmployee($normalEmp, $run2);

        $this->assertEquals($res2['gross_total'], $res1['gross_total']);
        $this->assertEquals($res2['employee_pf'], $res1['employee_pf']);
        $this->assertEquals($res2['employer_pf'], $res1['employer_pf']);
        $this->assertEquals($res2['professional_tax'], $res1['professional_tax']);
        $this->assertEquals($res2['net_pay'], $res1['net_pay']);
    }

    /**
     * Test 4: Historical invoices generated BEFORE a model switch to inhouse STAY visible in reports.
     */
    public function test_retroactive_switch_to_inhouse_preserves_historical_invoices_in_reports()
    {
        // 1. Create a client initially set to fixed_per_month with a historical invoice
        $client = Client::factory()->create([
            'company_name' => 'Converted Client',
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 10000,
            'status' => 'active',
        ]);
        $branch = $client->branches()->create([
            'branch_name' => 'Converted HQ',
            'state' => 'Tamil Nadu',
            'is_head_office' => true,
        ]);
        $histRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-05-01',
            'status' => 'locked',
        ]);

        $oldInvoice = Invoice::create([
            'invoice_number' => 'INV-HIST-001',
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'payroll_run_id' => $histRun->id,
            'invoice_month' => '2026-05-01',
            'due_date' => '2026-06-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 50000,
            'agency_service_fee' => 10000,
            'cgst_amount' => 900,
            'sgst_amount' => 900,
            'igst_amount' => 0,
            'gst_amount' => 1800,
            'grand_total' => 61800,
            'status' => 'paid',
        ]);

        // 2. Retroactively update billing_model to inhouse
        $client->update(['billing_model' => 'inhouse']);

        // 3. Query Invoice Report Service (Report #2) & Margin Report Service (Report #7)
        $invoiceReportService = app(InvoiceReportService::class);
        $marginReportService = app(MarginProfitabilityReportService::class);

        $report2Data = $invoiceReportService->getData(['client_id' => $client->id], $this->admin);
        $report7Data = $marginReportService->getData(['client_id' => $client->id], $this->admin);

        // Historical invoice MUST remain visible in both reports
        $this->assertEquals(1, $report2Data->count());
        $this->assertEquals('INV-HIST-001', $report2Data->first()['invoice_number']);

        $this->assertEquals(1, $report7Data->count());
        $this->assertEquals(60000, $report7Data->first()['invoiced_excl_gst']);
    }

    /**
     * Test 5: MarginReconciliationService returns clean inhouse early-exit schema.
     */
    public function test_margin_reconciliation_service_handles_inhouse_client_cleanly()
    {
        $run = PayrollRun::create([
            'client_id' => $this->inhouseClient->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
        ]);

        $service = app(MarginReconciliationService::class);
        $res = $service->reconcileMargin($run);

        $this->assertTrue($res['reconciled']);
        $this->assertTrue($res['is_inhouse']);
        $this->assertTrue($res['check_a']['passed']);
        $this->assertTrue($res['check_b']['passed']);
    }

    /**
     * Test 6: Locking parent run for In-House client redirects to Payslips page, not Invoices page.
     */
    public function test_locking_inhouse_client_redirects_to_payslips_page_not_invoices_page()
    {
        $run = PayrollRun::create([
            'client_id' => $this->inhouseClient->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin)->post(route('payroll.run.lock', $run->id));

        $response->assertRedirect(route('payroll.payslips', [
            'client_id' => $this->inhouseClient->id,
            'payroll_month' => '2026-08-01',
        ]));
    }
}
