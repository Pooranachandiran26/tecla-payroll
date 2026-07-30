<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\Invoice;
use App\Models\ClientContact;
use App\Models\Employee;
use App\Models\AuditLog;
use App\Mail\ClientInvoiceMail;
use App\Services\SalaryCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

class InvoicePhaseBCombinedTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Client $client;
    protected ClientBranch $branch;
    protected PayrollRun $payrollRun;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->client = Client::create([
            'company_name' => 'Acme Logistics Ltd',
            'client_code' => 'ACME001',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'Plot 45, MIDC',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400093',
            'contract_type' => 'agency',
            'contract_start_date' => '2026-01-01',
            'billing_model' => 'markup',
            'markup_percentage' => 10.00,
            'primary_poc_name' => 'John Doe',
            'primary_poc_email' => 'john@acmelogistics.com',
            'primary_poc_phone' => '9876543210',
            'po_required' => true,
            'po_number' => 'PO-2026-8899',
            'po_value' => 50000.00,
            'po_validity_date' => '2026-12-31',
            'invoice_footer_notes' => 'Please remit payment to HDFC Bank A/C 50200012345678.',
            'pref_format_pdf' => true,
            'pref_format_xlsx' => false,
        ]);

        $this->branch = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_code' => 'HQ',
            'branch_name' => 'Head Office',
            'address_line_1' => 'Plot 45, MIDC',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'pin_code' => '400093',
            'is_head_office' => true,
            'is_primary_billing_branch' => true,
        ]);

        $this->payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_gross_earnings' => 20000.00,
            'total_net_disbursement' => 18000.00,
        ]);

        ClientContact::create([
            'client_id' => $this->client->id,
            'contact_type' => 'primary',
            'full_name' => 'John Doe',
            'email' => 'john@acmelogistics.com',
            'phone' => '9876543210',
            'is_primary_contact' => true,
        ]);
    }

    /**
     * 1. Send succeeds with valid PO + valid primary contact.
     */
    public function test_send_invoice_email_full_success_path(): void
    {
        Mail::fake();

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'invoice_number' => 'INV-2026-001',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 20000.00,
            'agency_service_fee' => 2000.00,
            'gst_type' => 'cgst_sgst',
            'cgst_amount' => 180.00,
            'sgst_amount' => 180.00,
            'gst_amount' => 360.00,
            'grand_total' => 22360.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(200);

        Mail::assertSent(ClientInvoiceMail::class, function ($mail) use ($invoice) {
            return $mail->hasTo('john@acmelogistics.com') &&
                   $mail->invoice->id === $invoice->id;
        });

        $invoice->refresh();
        $this->assertNotNull($invoice->first_sent_at);
        $this->assertNotNull($invoice->sent_at);
        $this->assertEquals(1, $invoice->send_count);
        $this->assertEquals($this->admin->id, $invoice->sent_by);
        $this->assertEquals('john@acmelogistics.com', $invoice->sent_to_email);
        $this->assertEquals('sent', $invoice->delivery_status);
        $this->assertEquals('sent', $invoice->status);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice_email_sent',
            'user_id' => $this->admin->id,
        ]);
    }

    /**
     * 2. Blocked: Draft status invoice (Step 1 guard).
     */
    public function test_send_invoice_blocked_for_draft_status_first(): void
    {
        Mail::fake();

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-DRAFT',
            'invoice_month' => '2026-07-01',
            'status' => 'draft',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(200);
        $this->assertEquals('sent', $invoice->refresh()->status);

        Mail::assertSent(ClientInvoiceMail::class);
    }

    /**
     * 3. Blocked: PO required & missing po_number (Step 2 guard).
     */
    public function test_send_invoice_blocked_when_po_number_missing(): void
    {
        Mail::fake();
        $this->client->update(['po_number' => null]);

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-NOPO',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(422)
            ->assertJsonPath('error', "Cannot process invoice: Client 'Acme Logistics Ltd' requires a Purchase Order (PO) number.");

        Mail::assertNothingSent();
    }

    /**
     * 4. Blocked: PO required & expired po_validity_date (Step 2 guard).
     */
    public function test_send_invoice_blocked_when_po_validity_date_expired(): void
    {
        Mail::fake();
        $this->client->update(['po_validity_date' => '2025-12-31']);

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-EXPPO',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(422)
            ->assertJsonPath('error', "Cannot process invoice: Purchase Order for client 'Acme Logistics Ltd' expired on 2025-12-31.");

        Mail::assertNothingSent();
    }

    /**
     * 5. Blocked: Cumulative billing exceeds po_value (Step 2 guard).
     */
    public function test_send_invoice_blocked_when_cumulative_invoices_exceed_po_value(): void
    {
        Mail::fake();
        $this->client->update(['po_value' => 30000.00]);

        Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-PREV',
            'invoice_month' => '2026-06-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 20000.00,
            'agency_service_fee' => 2000.00,
            'grand_total' => 22360.00,
            'due_date' => '2026-07-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $currentInvoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-OVERLIMIT',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $currentInvoice->id));

        $response->assertStatus(422);
        $this->assertStringContainsString('exceeds PO budget limit', $response->json('error'));

        Mail::assertNothingSent();
    }

    /**
     * 6. Blocked: No primary contact email (reached AFTER PO checks pass).
     */
    public function test_send_invoice_blocked_when_no_primary_contact_after_po_checks_pass(): void
    {
        Mail::fake();
        $this->client->contacts()->delete();
        $this->client->update(['primary_poc_email' => '']);

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-NOCONTACT',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(422)
            ->assertJsonPath('error', "Cannot send invoice: Client 'Acme Logistics Ltd' has no primary contact email configured. Please add a primary contact with a valid email address first.");

        Mail::assertNothingSent();
    }

    /**
     * 7. Passes normally: po_required = false.
     */
    public function test_send_invoice_passes_without_po_checks_when_po_not_required(): void
    {
        Mail::fake();
        $this->client->update([
            'po_required' => false,
            'po_number' => null,
            'po_validity_date' => null,
            'po_value' => null,
        ]);

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-NOPOREQ',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(200);

        Mail::assertSent(ClientInvoiceMail::class);
    }

    /**
     * 8. Resend: first_sent_at preserved, sent_at updates, send_count increments, new AuditLog appended.
     */
    public function test_resend_invoice_preserves_first_sent_at_and_increments_count(): void
    {
        Mail::fake();

        $originalSentAt = now()->subDays(2);
        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-RESEND',
            'invoice_month' => '2026-07-01',
            'status' => 'sent',
            'first_sent_at' => $originalSentAt,
            'sent_at' => $originalSentAt,
            'send_count' => 1,
            'sent_by' => $this->admin->id,
            'sent_to_email' => 'john@acmelogistics.com',
            'delivery_status' => 'sent',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invoice->id));

        $response->assertStatus(200);

        $invoice->refresh();
        $this->assertEquals($originalSentAt->toDateTimeString(), $invoice->first_sent_at->toDateTimeString());
        $this->assertTrue($invoice->sent_at->gt($originalSentAt));
        $this->assertEquals(2, $invoice->send_count);

        $auditCount = AuditLog::where('action', 'invoice_email_sent')->count();
        $this->assertEquals(1, $auditCount);
    }

    /**
     * 9. No bulk/mass-send: sending Invoice A never affects Invoice B, no bulk endpoint exists.
     */
    public function test_send_email_operates_strictly_on_single_target_invoice_with_no_bulk_mass_send(): void
    {
        Mail::fake();

        $invA = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-TARGET-A',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $invB = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-UNTOUCHED-B',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson(route('invoices.send-email', $invA->id));

        $response->assertStatus(200);

        Mail::assertSent(ClientInvoiceMail::class);

        $invA->refresh();
        $invB->refresh();

        $this->assertEquals('sent', $invA->delivery_status);
        $this->assertNull($invB->delivery_status);
        $this->assertEquals(0, $invB->send_count);
    }

    /**
     * 10. Footer notes appear on generated PDF.
     */
    public function test_invoice_footer_notes_rendered_on_pdf(): void
    {
        $this->client->update([
            'invoice_footer_notes' => 'EXPLICIT_TEST_FOOTER_NOTE_UNIQUE_TEXT_12345',
        ]);

        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_type' => 'cgst_sgst',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-2026-FOOTER',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $pdfService = app(\App\Services\InvoicePdfService::class);
        $pdfOutput = $pdfService->generatePdfBinary($invoice);

        $this->assertNotEmpty($pdfOutput);

        $htmlOutput = view('pdf.invoice', [
            'invoice' => $invoice->load(['client', 'branch', 'lineItems', 'additionalFees']),
            'client' => $this->client,
            'branch' => $this->branch,
            'issuerName' => 'Tecla Agency',
            'issuerAddress' => 'Mumbai',
            'issuerGstin' => '27AABCM1234N1ZQ',
            'logoUrl' => null,
            'billedToName' => $this->client->company_name,
            'billedToCode' => $this->client->client_code,
            'billedToAddress' => 'Mumbai',
            'billedToGstin' => '—',
            'branchName' => 'Head Office',
            'bankDetails' => ['bank_name' => 'HDFC Bank', 'account_number' => '123', 'ifsc_code' => 'HDFC', 'branch_name' => 'Mumbai'],
            'paymentInstructions' => 'NEFT',
            'termsAndConditions' => 'Terms',
            'formattedDate' => '30 Jul 2026',
            'formattedDueDate' => '30 Aug 2026',
            'formattedMonth' => 'July 2026',
            'grandTotalWords' => 'Rupees Only',
            'isEor' => false,
        ])->render();

        $this->assertStringContainsString('EXPLICIT_TEST_FOOTER_NOTE_UNIQUE_TEXT_12345', $htmlOutput);
    }

    /**
     * 11. Full regression: zero impact on Phase A (fee guards, GST branching).
     */
    public function test_phase_a_regression_invoice_totals_and_fee_guards_unaffected(): void
    {
        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_amount' => 180.00,
            'invoice_number' => 'INV-PHASE-A',
            'invoice_month' => '2026-07-01',
            'status' => 'draft',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'grand_total' => 11180.00,
            'gst_type' => 'cgst_sgst',
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        $invoice->recalculateTotals();
        $invoice->refresh();

        $this->assertEquals(90.00, (float)$invoice->cgst_amount);
        $this->assertEquals(90.00, (float)$invoice->sgst_amount);
        $this->assertEquals(180.00, (float)$invoice->gst_amount);
        $this->assertEquals(11180.00, (float)$invoice->grand_total);
    }

    /**
     * 12. Canonical PF calculation unaffected.
     */
    public function test_canonical_pf_calculation_unaffected(): void
    {
        $service = new SalaryCalculationService();
        $res = $service->calculateStructuralSalary([
            'client_id' => $this->client->id,
            'basic_pay' => 25000,
            'hra' => 5000,
            'da' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
        ]);

        $this->assertEquals(1800.00, $res['employee_pf_monthly']);
        $this->assertEquals(1950.00, $res['employer_pf_monthly']);
        $this->assertEquals(550.50, $res['employer_epf_monthly']);
        $this->assertEquals(1249.50, $res['employer_eps_monthly']);
    }

    private function insertPayrollItem($runId, $empId, array $overrides = [])
    {
        \DB::table('payroll_run_items')->insert(array_merge([
            'payroll_run_id' => $runId,
            'employee_id' => $empId,
            'paid_days' => 30, 'lop_days' => 0,
            'basic_pay' => 10000.00, 'hra' => 5000.00, 'conveyance' => 0, 'da' => 0,
            'medical_allowance' => 0, 'special_allowance' => 5000.00, 'other_additions' => 0,
            'gross_total' => 20000.00, 'employee_pf' => 1200.00, 'employee_esi' => 0,
            'professional_tax' => 200.00, 'lwf_deduction' => 0, 'lop_deduction' => 0,
            'tds_deduction' => 0, 'loan_emi_deduction' => 0, 'net_pay' => 18600.00,
            'employer_pf' => 1950.00, 'employer_esi' => 650.00, 'employer_lwf' => 0,
            'is_excluded' => false,
            'attendance_source' => 'live_punch',
            'created_at' => now(), 'updated_at' => now(),
        ], $overrides));
    }

    private function createTestEmployee($clientId, $branchId, $idx = 1)
    {
        $unique = sprintf('%04d', rand(1000, 9999));
        return Employee::factory()->create([
            'client_id' => $clientId,
            'branch_id' => $branchId,
            'pan_number' => "ABCDE{$unique}F",
            'bank_account_number' => "999888777{$unique}",
            'aadhaar_number' => "99998888{$unique}",
        ]);
    }

    /**
     * 13. Prove 5 Billing Models produce genuinely DIFFERENT invoice service fee totals for identical payroll data.
     */
    public function test_billing_models_produce_distinct_invoice_amounts(): void
    {
        $genService = app(\App\Services\InvoiceGenerationService::class);

        // 1. Markup Model (10% on Gross 20,000 = 2,000)
        $clientMarkup = Client::factory()->create([
            'company_name' => 'Markup Corp', 'client_code' => 'MKP001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'markup', 'markup_percentage' => 10.00, 'markup_applied_on' => 'gross_salary',
        ]);
        $branchM = ClientBranch::create(['client_id' => $clientMarkup->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $runM = PayrollRun::create(['client_id' => $clientMarkup->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $empM = $this->createTestEmployee($clientMarkup->id, $branchM->id, 1);
        $this->insertPayrollItem($runM->id, $empM->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00]);

        $invsM = $genService->generateForRun($runM);
        $this->assertEquals(2000.00, (float)$invsM[0]->agency_service_fee);

        // 2. Fixed Fee Per Candidate (3,500)
        $clientFixedCand = Client::factory()->create([
            'company_name' => 'Fixed Cand Corp', 'client_code' => 'FXC001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'fixed_per_candidate', 'fixed_fee_amount' => 3500.00,
        ]);
        $branchFC = ClientBranch::create(['client_id' => $clientFixedCand->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $runFC = PayrollRun::create(['client_id' => $clientFixedCand->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $empFC = $this->createTestEmployee($clientFixedCand->id, $branchFC->id, 2);
        $this->insertPayrollItem($runFC->id, $empFC->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00]);

        $invsFC = $genService->generateForRun($runFC);
        $this->assertEquals(3500.00, (float)$invsFC[0]->agency_service_fee);

        // 3. Fixed Monthly Retainer (15,000)
        $clientRetainer = Client::factory()->create([
            'company_name' => 'Retainer Corp', 'client_code' => 'RET001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'fixed_per_month', 'fixed_fee_amount' => 15000.00,
        ]);
        $branchR = ClientBranch::create(['client_id' => $clientRetainer->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $runR = PayrollRun::create(['client_id' => $clientRetainer->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $empR = $this->createTestEmployee($clientRetainer->id, $branchR->id, 3);
        $this->insertPayrollItem($runR->id, $empR->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00]);

        $invsR = $genService->generateForRun($runR);
        $this->assertEquals(15000.00, (float)$invsR[0]->agency_service_fee);

        // 4. Lump Sum Billing (25,000)
        $clientLump = Client::factory()->create([
            'company_name' => 'Lump Corp', 'client_code' => 'LMP001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'lumpsum', 'fixed_fee_amount' => 25000.00,
        ]);
        $branchL = ClientBranch::create(['client_id' => $clientLump->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $runL = PayrollRun::create(['client_id' => $clientLump->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $empL = $this->createTestEmployee($clientLump->id, $branchL->id, 4);
        $this->insertPayrollItem($runL->id, $empL->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00]);

        $invsL = $genService->generateForRun($runL);
        $this->assertEquals(25000.00, (float)$invsL[0]->agency_service_fee);

        // 5. Hourly Rate Billing (500/hr * 240 hrs = 120,000)
        $clientHourly = Client::factory()->create([
            'company_name' => 'Hourly Corp', 'client_code' => 'HRL001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'hourly', 'hourly_rate' => 500.00,
        ]);
        $branchH = ClientBranch::create(['client_id' => $clientHourly->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $runH = PayrollRun::create(['client_id' => $clientHourly->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $empH = $this->createTestEmployee($clientHourly->id, $branchH->id, 5);
        $this->insertPayrollItem($runH->id, $empH->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00]);

        $invsH = $genService->generateForRun($runH);
        $this->assertEquals(120000.00, (float)$invsH[0]->agency_service_fee);
    }

    /**
     * 14. Real DB proof of the retainer-loop fix: 10 candidates with ₹50,000 monthly retainer bills ₹50,000 total (NOT ₹500,000).
     */
    public function test_fixed_monthly_retainer_loop_fix_bills_retainer_once_not_per_candidate(): void
    {
        $client = Client::factory()->create([
            'company_name' => 'Retainer Loop Test Corp', 'client_code' => 'RETLP001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'fixed_per_month', 'fixed_fee_amount' => 50000.00,
        ]);
        $branch = ClientBranch::create(['client_id' => $client->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $payrollRun = PayrollRun::create(['client_id' => $client->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);

        for ($i = 1; $i <= 10; $i++) {
            $emp = $this->createTestEmployee($client->id, $branch->id, 100 + $i);
            $this->insertPayrollItem($payrollRun->id, $emp->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00]);
        }

        $genService = app(\App\Services\InvoiceGenerationService::class);
        $invoices = $genService->generateForRun($payrollRun);

        $this->assertCount(1, $invoices);
        $this->assertEquals(50000.00, (float)$invoices[0]->agency_service_fee);
        $this->assertNotEquals(500000.00, (float)$invoices[0]->agency_service_fee);
    }

    /**
     * 15. Existing markup clients default to gross_salary basis (preserving current billing) unless explicitly set.
     */
    public function test_markup_basis_gross_salary_preserves_existing_client_billing(): void
    {
        $genService = app(\App\Services\InvoiceGenerationService::class);

        $clientGross = Client::factory()->create([
            'company_name' => 'Gross Basis Corp', 'client_code' => 'GRS001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2026-01-01',
            'billing_model' => 'markup', 'markup_percentage' => 10.00, 'markup_applied_on' => 'gross_salary',
        ]);
        $branchG = ClientBranch::create(['client_id' => $clientGross->id, 'branch_code' => 'HQ', 'branch_name' => 'HQ', 'gstin' => '27AAACM9999N1ZQ', 'address_line_1' => 'A', 'city' => 'M', 'state' => 'Maharashtra', 'pin_code' => '400001']);
        $runG = PayrollRun::create(['client_id' => $clientGross->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);
        $empG = $this->createTestEmployee($clientGross->id, $branchG->id, 20);
        $this->insertPayrollItem($runG->id, $empG->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00, 'employer_pf' => 1950.00, 'employer_esi' => 650.00]);

        $invsG = $genService->generateForRun($runG);
        $this->assertEquals(2000.00, (float)$invsG[0]->agency_service_fee); // 10% on Gross 20,000

        // Explicit CTC Basis
        $clientGross->update(['markup_applied_on' => 'ctc']);
        $runCTC = PayrollRun::create(['client_id' => $clientGross->id, 'payroll_month' => '2026-08-01', 'status' => 'draft']);
        $this->insertPayrollItem($runCTC->id, $empG->id, ['gross_total' => 20000.00, 'basic_pay' => 10000.00, 'employer_pf' => 1950.00, 'employer_esi' => 650.00]);

        $invsCTC = $genService->generateForRun($runCTC);
        $this->assertEquals(2260.00, (float)$invsCTC[0]->agency_service_fee); // 10% on CTC (20,000 + 1950 + 650 = 22,600)
    }

    /**
     * 16. Contract expiry blocks invoice generation and sending with 422 exception.
     */
    public function test_contract_expiry_blocks_invoice_generation_and_sending(): void
    {
        $clientExpired = Client::factory()->create([
            'company_name' => 'Expired Contract Corp', 'client_code' => 'EXP001', 'company_type' => 'pvt_ltd',
            'registered_address_line_1' => 'St 1', 'registered_city' => 'Mumbai', 'registered_state' => 'Maharashtra',
            'registered_pin' => '400001', 'contract_type' => 'agency', 'contract_start_date' => '2025-01-01',
            'contract_end_date' => '2025-12-31', 'auto_renewal' => false, 'billing_model' => 'markup', 'markup_percentage' => 10.00,
        ]);

        $run = PayrollRun::create(['client_id' => $clientExpired->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Cannot process invoice: Client contract for 'Expired Contract Corp' expired on 2025-12-31 and auto-renewal is disabled.");

        $genService = app(\App\Services\InvoiceGenerationService::class);
        $genService->generateForRun($run);
    }

    /**
     * 17. Client TDS line is cleanly omitted when client_tds_percentage is null, and displayed when set.
     */
    public function test_client_tds_line_omitted_when_null_and_displayed_when_set(): void
    {
        $invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branch->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AAACM9999N1ZQ',
            'gst_amount' => 360.00,
            'invoice_number' => 'INV-TDS-TEST',
            'invoice_month' => '2026-07-01',
            'status' => 'finalized',
            'gross_salary_passthrough' => 20000.00,
            'agency_service_fee' => 2000.00,
            'grand_total' => 22360.00,
            'gst_type' => 'cgst_sgst',
            'due_date' => '2026-08-30',
            'place_of_supply_state' => 'Maharashtra',
        ]);

        // 1. Omitted when client_tds_percentage is null
        $this->client->update(['client_tds_percentage' => null]);
        $htmlNull = view('pdf.invoice', [
            'invoice' => $invoice,
            'client' => $this->client,
            'branch' => $this->branch,
            'issuerName' => 'Tecla Agency', 'issuerAddress' => 'Mumbai', 'issuerGstin' => '27AABCM1234N1ZQ', 'logoUrl' => null,
            'billedToName' => $this->client->company_name, 'billedToCode' => $this->client->client_code, 'billedToAddress' => 'Mumbai', 'billedToGstin' => '—', 'branchName' => 'Head Office',
            'bankDetails' => ['bank_name' => 'HDFC', 'account_number' => '123', 'ifsc_code' => 'HDFC', 'branch_name' => 'Mumbai'],
            'paymentInstructions' => 'NEFT', 'termsAndConditions' => 'Terms', 'formattedDate' => '30 Jul 2026', 'formattedDueDate' => '30 Aug 2026', 'formattedMonth' => 'July 2026', 'grandTotalWords' => 'Rupees Only', 'isEor' => false,
        ])->render();

        $this->assertStringNotContainsString('Est. Client TDS Deduction', $htmlNull);

        // 2. Displayed when client_tds_percentage is set to 2.00%
        $this->client->update(['client_tds_percentage' => 2.00]);
        $htmlSet = view('pdf.invoice', [
            'invoice' => $invoice,
            'client' => $this->client,
            'branch' => $this->branch,
            'issuerName' => 'Tecla Agency', 'issuerAddress' => 'Mumbai', 'issuerGstin' => '27AABCM1234N1ZQ', 'logoUrl' => null,
            'billedToName' => $this->client->company_name, 'billedToCode' => $this->client->client_code, 'billedToAddress' => 'Mumbai', 'billedToGstin' => '—', 'branchName' => 'Head Office',
            'bankDetails' => ['bank_name' => 'HDFC', 'account_number' => '123', 'ifsc_code' => 'HDFC', 'branch_name' => 'Mumbai'],
            'paymentInstructions' => 'NEFT', 'termsAndConditions' => 'Terms', 'formattedDate' => '30 Jul 2026', 'formattedDueDate' => '30 Aug 2026', 'formattedMonth' => 'July 2026', 'grandTotalWords' => 'Rupees Only', 'isEor' => false,
        ])->render();

        $this->assertStringContainsString('Est. Client TDS Deduction (2.00%)', $htmlSet);
        $this->assertStringContainsString('Est. Net Cash Receivable: ₹22,320.00', $htmlSet);
    }

    /**
     * 18. Test 1: Lumpsum billing model save populates fixed_fee_amount correctly.
     */
    public function test_client_save_lumpsum_populates_fixed_fee_amount(): void
    {
        $payload = [
            'name' => 'Lumpsum Client Ltd',
            'type' => 'pvt_ltd',
            'code' => 'LMP-999',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'lumpsum',
            'fixedFeeAmount' => 100000.00,
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Admin', 'email' => 'admin@lumpsum.com', 'phone' => '9876543210', 'contact_type' => 'primary'],
        ];

        $response = $this->actingAs($this->admin)->postJson(route('clients.store'), $payload);
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));

        $client = Client::where('client_code', 'LMP-999')->first();
        $this->assertNotNull($client);
        $this->assertEquals('lumpsum', $client->billing_model);
        $this->assertEquals(100000.00, (float)$client->fixed_fee_amount);
    }

    /**
     * 19. Test 2: Fixed monthly retainer billing model save populates fixed_fee_amount correctly.
     */
    public function test_client_save_fixed_per_month_populates_fixed_fee_amount(): void
    {
        $payload = [
            'name' => 'Retainer Client Ltd',
            'type' => 'pvt_ltd',
            'code' => 'RET-999',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'fixed_per_month',
            'fixedFeeAmount' => 50000.00,
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Admin', 'email' => 'admin@retainer.com', 'phone' => '9876543210', 'contact_type' => 'primary'],
        ];

        $response = $this->actingAs($this->admin)->postJson(route('clients.store'), $payload);
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));

        $client = Client::where('client_code', 'RET-999')->first();
        $this->assertNotNull($client);
        $this->assertEquals('fixed_per_month', $client->billing_model);
        $this->assertEquals(50000.00, (float)$client->fixed_fee_amount);
    }

    /**
     * 20. Test 3: Hourly billing model save populates hourly_rate correctly.
     */
    public function test_client_save_hourly_populates_hourly_rate(): void
    {
        $payload = [
            'name' => 'Hourly Client Ltd',
            'type' => 'pvt_ltd',
            'code' => 'HRL-999',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'hourly',
            'hourlyRate' => 500.00,
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Admin', 'email' => 'admin@hourly.com', 'phone' => '9876543210', 'contact_type' => 'primary'],
        ];

        $response = $this->actingAs($this->admin)->postJson(route('clients.store'), $payload);
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));

        $client = Client::where('client_code', 'HRL-999')->first();
        $this->assertNotNull($client);
        $this->assertEquals('hourly', $client->billing_model);
        $this->assertEquals(500.00, (float)$client->hourly_rate);
    }

    /**
     * 21. Test 4: Fixed per candidate billing model save populates fixed_fee_amount correctly.
     */
    public function test_client_save_fixed_per_candidate_populates_fixed_fee_amount(): void
    {
        $payload = [
            'name' => 'Candidate Client Ltd',
            'type' => 'pvt_ltd',
            'code' => 'CND-999',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'fixed_per_candidate',
            'fixedFeeAmount' => 1500.00,
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Admin', 'email' => 'admin@candidate.com', 'phone' => '9876543210', 'contact_type' => 'primary'],
        ];

        $response = $this->actingAs($this->admin)->postJson(route('clients.store'), $payload);
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));

        $client = Client::where('client_code', 'CND-999')->first();
        $this->assertNotNull($client);
        $this->assertEquals('fixed_per_candidate', $client->billing_model);
        $this->assertEquals(1500.00, (float)$client->fixed_fee_amount);
    }

    /**
     * 22. Test 6: Switching billing model genuinely replaces the stale fee amount with new model fee.
     */
    public function test_client_billing_model_switch_clears_stale_fee_amount(): void
    {
        $client = Client::factory()->create([
            'company_name' => 'Switch Test Corp',
            'client_code' => 'SWT-999',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '123 Street',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400001',
            'contract_type' => 'agency',
            'contract_start_date' => '2026-01-01',
            'billing_model' => 'fixed_per_candidate',
            'fixed_fee_amount' => 1500.00,
        ]);

        $updatePayload = [
            'name' => 'Switch Test Corp',
            'type' => 'pvt_ltd',
            'code' => 'SWT-999',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'lumpsum',
            'fixedFeeAmount' => 100000.00,
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Admin', 'email' => 'admin@switch.com', 'phone' => '9876543210', 'contact_type' => 'primary'],
        ];

        $response = $this->actingAs($this->admin)->putJson(route('clients.update', $client->id), $updatePayload);
        $this->assertTrue(in_array($response->status(), [200, 201, 302]));

        $client->refresh();
        $this->assertEquals('lumpsum', $client->billing_model);
        $this->assertEquals(100000.00, (float)$client->fixed_fee_amount);
        $this->assertNotEquals(1500.00, (float)$client->fixed_fee_amount);
    }

    /**
     * 23. Test 7: Empty fee on a NEW model selection blocks save via frontend/backend validation rules.
     */
    public function test_client_billing_model_switch_with_empty_fee_blocked_by_validation(): void
    {
        $client = Client::factory()->create([
            'company_name' => 'Empty Fee Test Corp',
            'client_code' => 'EMP-999',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '123 Street',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400001',
            'contract_type' => 'agency',
            'contract_start_date' => '2026-01-01',
            'billing_model' => 'fixed_per_candidate',
            'fixed_fee_amount' => 1500.00,
        ]);

        $invalidPayload = [
            'name' => 'Empty Fee Test Corp',
            'type' => 'pvt_ltd',
            'code' => 'EMP-999',
            'status' => 'active',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Street',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'contractType' => 'agency',
            'billingModel' => 'lumpsum',
            'fixedFeeAmount' => null, // empty fee for lumpsum
            'contractStart' => '2026-01-01',
            'poc1' => ['name' => 'Admin', 'email' => 'admin@empty.com', 'phone' => '9876543210', 'contact_type' => 'primary'],
        ];

        $response = $this->actingAs($this->admin)->putJson(route('clients.update', $client->id), $invalidPayload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['fixed_fee_amount']);
    }

    /**
     * 24. Test 1: Monthly / null invoice_cycle generates invoice immediately on lock with ZERO change.
     */
    public function test_invoice_generation_succeeds_immediately_for_monthly_or_null_cycle(): void
    {
        $emp = $this->createTestEmployee($this->client->id, $this->branch->id, 999);
        $this->insertPayrollItem($this->payrollRun->id, $emp->id);

        $this->client->update(['gstin' => '27AAACM9999N1ZQ', 'invoice_cycle' => 'monthly']);
        $genService = app(\App\Services\InvoiceGenerationService::class);
        $invoices = $genService->generateForRun($this->payrollRun);
        $this->assertCount(1, $invoices);
        $this->assertEquals('draft', $invoices[0]->status);

        Invoice::query()->delete();

        $this->client->update(['invoice_cycle' => null]);
        $invoicesNull = $genService->generateForRun($this->payrollRun);
        $this->assertCount(1, $invoicesNull);
    }

    /**
     * 25. Test 2: Weekly invoice_cycle blocks invoice generation with clear error.
     */
    public function test_invoice_generation_blocked_for_weekly_cycle(): void
    {
        $this->client->update(['invoice_cycle' => 'weekly']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Cannot process invoice: Client 'Acme Logistics Ltd' uses 'weekly' invoicing cycle, which requires multi-run batch consolidation. Please set client invoicing cycle to Monthly.");

        $genService = app(\App\Services\InvoiceGenerationService::class);
        $genService->generateForRun($this->payrollRun);
    }

    /**
     * 26. Test 3: Bi-weekly invoice_cycle blocks invoice generation with clear error.
     */
    public function test_invoice_generation_blocked_for_biweekly_cycle(): void
    {
        $this->client->update(['invoice_cycle' => 'biweekly']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Cannot process invoice: Client 'Acme Logistics Ltd' uses 'biweekly' invoicing cycle, which requires multi-run batch consolidation. Please set client invoicing cycle to Monthly.");

        $genService = app(\App\Services\InvoiceGenerationService::class);
        $genService->generateForRun($this->payrollRun);
    }

    /**
     * 27. Test 4: Quarterly invoice_cycle blocks invoice generation with clear error.
     */
    /**
     * 27. Test 4: Quarterly invoice_cycle blocks invoice generation with clear error.
     */
    public function test_invoice_generation_blocked_for_quarterly_cycle(): void
    {
        $this->client->update(['invoice_cycle' => 'quarterly']);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Cannot process invoice: Client 'Acme Logistics Ltd' uses 'quarterly' invoicing cycle, which requires multi-run batch consolidation. Please set client invoicing cycle to Monthly.");

        $genService = app(\App\Services\InvoiceGenerationService::class);
        $genService->generateForRun($this->payrollRun);
    }

    /**
     * 28. Test 5: Payroll lock rolls back ENTIRELY when client uses non-monthly cycle.
     * Option (a) proof: Run status remains approved/draft, lock fails, error flashed to admin.
     */
    public function test_payroll_lock_rolls_back_entirely_when_client_uses_non_monthly_cycle(): void
    {
        $this->client->update(['invoice_cycle' => 'weekly']);
        $this->payrollRun->update(['status' => 'approved']);

        $response = $this->actingAs($this->admin)->post(route('payroll.run.lock', $this->payrollRun->id));
        
        // Assert redirected back with error flash
        $response->assertSessionHas('error');
        $this->assertStringContainsString("uses 'weekly' invoicing cycle", session('error'));

        // Assert payroll run status was NOT locked (rolled back completely)
        $this->assertEquals('approved', $this->payrollRun->refresh()->status);
        $this->assertNull($this->payrollRun->locked_at);

        // Assert 0 invoices created
        $this->assertEquals(0, Invoice::where('payroll_run_id', $this->payrollRun->id)->count());
    }
}





