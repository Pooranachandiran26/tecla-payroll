<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\Employee;
use App\Models\Invoice;
use App\Services\InvoiceGenerationService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InvoiceBillingLogicTest extends TestCase
{
    use RefreshDatabase;

    protected $client;
    protected $branch;
    protected $payrollRun;
    protected $employee;
    protected $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        // Seed agency GSTIN
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_gstin'],
            ['value' => '27AABCM1234N1ZQ', 'type' => 'string']
        );

        $this->client = Client::factory()->create([
            'status' => 'active',
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 1000.00,
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'HQ Branch',
            'gstin' => '27AABCT1234L1ZQ',
        ]);

        $this->employee = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'basic_pay' => 10000.00,
            'hra' => 5000.00,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);

        $this->payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $this->payrollRun->id,
            'employee_id' => $this->employee->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 10000.00,
            'hra' => 5000.00,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_total' => 15000.00,
            'employee_pf' => 0,
            'employee_esi' => 0,
            'professional_tax' => 0,
            'lwf_deduction' => 0,
            'lop_deduction' => 0,
            'tds_deduction' => 0,
            'loan_emi_deduction' => 0,
            'net_pay' => 13000.00,
            'employer_pf' => 0,
            'employer_esi' => 0,
            'is_excluded' => false,
            'employer_lwf' => 0,
            'deferred_loan_amount' => 0,
            'attendance_source' => 'live_punch',
        ]);

        $this->payrollRun->update(['status' => 'approved']);

        $this->service = new InvoiceGenerationService();
    }

    /**
     * Test 1: Credit limit exceeded warning note fires.
     * The invoice grand total will be 15000 (gross) + 1000 (fee) + 180 (GST) = 16180.
     * With a credit limit of 15000, it should exceed it and generate a warning.
     */
    public function test_invoice_generation_exceeds_credit_limit_warning()
    {
        $this->client->update(['credit_limit' => 15000.00]);

        $invoices = $this->service->generateForRun($this->payrollRun);

        $this->assertCount(1, $invoices);
        $invoice = $invoices[0];

        $this->assertNotNull($invoice->warning_notes);
        $this->assertStringContainsString('Credit limit of ₹15,000.00 exceeded', $invoice->warning_notes);
        $this->assertStringContainsString('Outstanding unpaid total: ₹16,180.00', $invoice->warning_notes);
    }

    /**
     * Test 2: Invoice generation with null or high credit limit does not fire warning.
     */
    public function test_invoice_generation_no_credit_limit_warning()
    {
        // Case A: Credit limit is null/0
        $this->client->update(['credit_limit' => null]);
        $invoices = $this->service->generateForRun($this->payrollRun);
        $this->assertNull($invoices[0]->warning_notes);

        // Case B: Credit limit is high enough (e.g. 50000)
        $this->client->update(['credit_limit' => 50000.00]);
        // Re-generate by deleting previous invoice
        Invoice::query()->delete();
        $invoices2 = $this->service->generateForRun($this->payrollRun);
        $this->assertNull($invoices2[0]->warning_notes);
    }

    /**
     * Test 3: Overdue invoice late penalty calculations are mathematically correct.
     * Let grand_total = 10000.00
     * Let due_date = 10 days in the past
     * Let late_payment_penalty_pct = 1.5% per month
     * daily_rate = (1.5 / 30) / 100 = 0.0005
     * penalty = 10000 * 0.0005 * 10 = 50.00
     */
    public function test_overdue_invoice_calculates_penalty_correctly()
    {
        $this->client->update(['late_payment_penalty_pct' => 1.50]);

        $invoice = Invoice::create([
            'invoice_number' => 'INV-TEST-PENALTY',
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCT1234L1ZQ',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 9000.00,
            'agency_service_fee' => 1000.00,
            'gst_amount' => 180.00,
            'grand_total' => 10000.00,
            'status' => 'overdue',
            'due_date' => Carbon::now()->subDays(10)->toDateString(),
        ]);

        // Calculate and assert
        $penalty = $invoice->late_penalty_amount;
        $this->assertEquals(50.00, $penalty);
    }

    /**
     * Test 4: Dispute window expiration calculation is correct.
     * Let invoice_dispute_window_days = 15.
     * dispute_window_expires_at should be exactly now() + 15 days.
     */
    public function test_invoice_dispute_window_expiration_calculated_correctly()
    {
        $this->client->update(['invoice_dispute_window_days' => 15]);

        $invoices = $this->service->generateForRun($this->payrollRun);
        $this->assertCount(1, $invoices);
        
        $expectedDate = Carbon::now()->addDays(15)->toDateString();
        $this->assertEquals($expectedDate, $invoices[0]->dispute_window_expires_at);
    }
}
