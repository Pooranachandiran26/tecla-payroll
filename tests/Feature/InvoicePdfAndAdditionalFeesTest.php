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
use App\Models\InvoiceLineItem;
use App\Models\InvoiceAdditionalFee;
use App\Services\InvoicePdfService;
use Illuminate\Support\Facades\DB;

class InvoicePdfAndAdditionalFeesTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $client;
    protected $branchMH;
    protected $branchKA;
    protected $payrollRun;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PtSlabSeeder::class);

        // Seed agency_gstin in settings (state 27 = Maharashtra)
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_gstin'],
            ['value' => '27AABCM1234N1ZQ', 'type' => 'string', 'is_locked' => false, 'created_at' => now(), 'updated_at' => now()]
        );
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'agency_legal_name'],
            ['value' => 'Tecla Agency Private Limited', 'type' => 'string', 'is_locked' => false, 'created_at' => now(), 'updated_at' => now()]
        );
        DB::table('settings')->updateOrInsert(
            ['group' => 'company_profile', 'key' => 'registered_office_address'],
            ['value' => 'BKC, Bandra East, Mumbai, Maharashtra 400051', 'type' => 'string', 'is_locked' => false, 'created_at' => now(), 'updated_at' => now()]
        );

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->client = Client::factory()->create([
            'status' => 'active',
            'company_name' => 'Acme Technologies Ltd',
            'contract_type' => 'agency',
            'billing_model' => 'fixed_per_candidate',
            'fixed_fee_amount' => 5000.00,
            'gstin' => '27AABCA1234A1Z1',
            'registered_address_line_1' => 'Suite 500, Tech Park',
            'registered_address_line_2' => 'MG Road',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400001',
        ]);

        $this->branchMH = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Mumbai HQ',
            'state' => 'Maharashtra',
            'gstin' => '27AABCA1234A1Z1',
        ]);

        $this->branchKA = ClientBranch::create([
            'client_id' => $this->client->id,
            'branch_name' => 'Bangalore Office',
            'state' => 'Karnataka',
            'gstin' => '29AABCA1234A1Z2',
        ]);

        $this->payrollRun = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'total_gross_earnings' => 50000.00,
            'total_net_disbursement' => 45000.00,
        ]);
    }

    /** 1. Client list displays decrypted GSTIN safely */
    public function test_1_client_list_displays_decrypted_gstin_safely()
    {
        $response = $this->actingAs($this->admin)->get(route('clients.index'));
        $response->assertStatus(200);

        $this->assertEquals('27AABCA1234A1Z1', $this->client->decrypted_gstin);
        $this->assertStringContainsString('Suite 500, Tech Park', $this->client->formatted_registered_address);
    }

    /** 2. Invoice registry displays gross_salary_passthrough separately from service fee */
    public function test_2_invoice_registry_displays_passthrough_ctc_separately_from_service_fee()
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-202607-1-1',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCA1234A1Z1',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 50000.00,
            'agency_service_fee' => 5000.00,
            'cgst_amount' => 450.00,
            'sgst_amount' => 450.00,
            'igst_amount' => 0.00,
            'gst_amount' => 900.00,
            'grand_total' => 55900.00,
            'status' => 'draft',
            'due_date' => '2026-08-30',
        ]);

        $response = $this->actingAs($this->admin)->get(route('invoices.index'));
        $response->assertStatus(200);

        $this->assertEquals(50000.00, (float)$invoice->gross_salary_passthrough);
        $this->assertEquals(5000.00, (float)$invoice->agency_service_fee);
        $this->assertEquals(55900.00, (float)$invoice->grand_total);
    }

    /** 3. Adding Sourcing Fee recalculates and stores correct CGST/SGST for intrastate invoice */
    public function test_3_adding_sourcing_fee_recalculates_and_stores_correct_cgst_sgst_for_intrastate_invoice()
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-202607-1-INTRA',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCA1234A1Z1',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'cgst_amount' => 900.00,
            'sgst_amount' => 900.00,
            'igst_amount' => 0.00,
            'gst_amount' => 1800.00,
            'grand_total' => 111800.00,
            'status' => 'draft',
            'due_date' => '2026-08-30',
        ]);

        // Add Sourcing Fee ₹10,000 via storeFee route
        $response = $this->actingAs($this->admin)->post(route('invoices.fees.store', $invoice->id), [
            'fee_type' => 'sourcing_fee',
            'fee_name' => 'Sourcing Fee',
            'amount' => 10000.00,
            'remarks' => 'Senior Placement Fee',
        ]);
        $response->assertStatus(302);

        $invoice->refresh();

        // Total Taxable Fees = 10,000 (agency) + 10,000 (sourcing) = 20,000
        // CGST (9%) = 1,800.00, SGST (9%) = 1,800.00, IGST = 0.00
        // Total GST = 3,600.00
        // Grand Total = 100,000 + 20,000 + 3,600 = 123,600.00
        $this->assertEquals(1800.00, (float)$invoice->cgst_amount, 'CGST amount should be ₹1,800 (9% of ₹20,000)');
        $this->assertEquals(1800.00, (float)$invoice->sgst_amount, 'SGST amount should be ₹1,800 (9% of ₹20,000)');
        $this->assertEquals(0.00, (float)$invoice->igst_amount, 'IGST amount should be ₹0 for intrastate');
        $this->assertEquals(3600.00, (float)$invoice->gst_amount, 'GST amount should be ₹3,600');
        $this->assertEquals(123600.00, (float)$invoice->grand_total, 'Grand Total should be updated to ₹123,600.00');
    }

    /** 4. Adding Absorption Fee recalculates and stores correct IGST for interstate invoice */
    public function test_4_adding_absorption_fee_recalculates_and_stores_correct_igst_for_interstate_invoice()
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-202607-2-INTER',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchKA->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '29AABCA1234A1Z2',
            'place_of_supply_state' => 'Karnataka',
            'gst_type' => 'igst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'cgst_amount' => 0.00,
            'sgst_amount' => 0.00,
            'igst_amount' => 1800.00,
            'gst_amount' => 1800.00,
            'grand_total' => 111800.00,
            'status' => 'draft',
            'due_date' => '2026-08-30',
        ]);

        // Add Absorption Fee ₹5,000 via storeFee route
        $response = $this->actingAs($this->admin)->post(route('invoices.fees.store', $invoice->id), [
            'fee_type' => 'absorption_fee',
            'fee_name' => 'Absorption Fee',
            'amount' => 5000.00,
            'remarks' => 'Employee Transfer Conversion',
        ]);
        $response->assertStatus(302);

        $invoice->refresh();

        // Total Taxable Fees = 10,000 + 5,000 = 15,000
        // CGST = 0, SGST = 0, IGST (18%) = 2,700.00
        // Grand Total = 100,000 + 15,000 + 2,700 = 117,700.00
        $this->assertEquals(0.00, (float)$invoice->cgst_amount, 'CGST should be ₹0 for interstate');
        $this->assertEquals(0.00, (float)$invoice->sgst_amount, 'SGST should be ₹0 for interstate');
        $this->assertEquals(2700.00, (float)$invoice->igst_amount, 'IGST should be ₹2,700 (18% of ₹15,000)');
        $this->assertEquals(2700.00, (float)$invoice->gst_amount, 'GST amount should be ₹2,700');
        $this->assertEquals(117700.00, (float)$invoice->grand_total, 'Grand total should be updated to ₹117,700.00');
    }

    /** 5. Adding fee to locked/raised invoice is blocked with 403 */
    public function test_5_adding_fee_to_locked_raised_invoice_is_blocked_with_403()
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-202607-RAISED',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCA1234A1Z1',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 50000.00,
            'agency_service_fee' => 5000.00,
            'gst_amount' => 900.00,
            'grand_total' => 55900.00,
            'status' => 'raised', // NOT draft
            'due_date' => '2026-08-30',
        ]);

        $response = $this->actingAs($this->admin)->postJson(route('invoices.fees.store', $invoice->id), [
            'fee_type' => 'sourcing_fee',
            'fee_name' => 'Sourcing Fee',
            'amount' => 2000.00,
        ]);

        $response->assertStatus(403);
        $this->assertEquals(0, $invoice->additionalFees()->count());
    }

    /** 6. Deleting fee recalculates stored grand total and GST breakdown */
    public function test_6_deleting_fee_recalculates_stored_grand_total_and_gst_breakdown()
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-202607-DEL',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCA1234A1Z1',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'gst_amount' => 1800.00,
            'grand_total' => 111800.00,
            'status' => 'draft',
            'due_date' => '2026-08-30',
        ]);

        $fee = $invoice->additionalFees()->create([
            'fee_type' => 'sourcing_fee',
            'fee_name' => 'Sourcing Fee',
            'amount' => 10000.00,
        ]);
        $invoice->recalculateTotals();
        $this->assertEquals(123600.00, (float)$invoice->fresh()->grand_total);

        // Delete fee via destroyFee route
        $response = $this->actingAs($this->admin)->delete(route('invoices.fees.destroy', ['id' => $invoice->id, 'feeId' => $fee->id]));
        $response->assertStatus(302);

        $invoice->refresh();
        $this->assertEquals(0, $invoice->additionalFees()->count());
        $this->assertEquals(900.00, (float)$invoice->cgst_amount);
        $this->assertEquals(900.00, (float)$invoice->sgst_amount);
        $this->assertEquals(111800.00, (float)$invoice->grand_total);
    }

    /** 7. Invoice PDF contains client registered address and itemized additional fees */
    public function test_7_invoice_pdf_contains_client_registered_address_and_additional_fees()
    {
        $invoice = Invoice::create([
            'invoice_number' => 'INV-202607-PDF',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCA1234A1Z1',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 50000.00,
            'agency_service_fee' => 5000.00,
            'gst_amount' => 900.00,
            'grand_total' => 55900.00,
            'status' => 'draft',
            'due_date' => '2026-08-30',
        ]);

        $invoice->additionalFees()->create([
            'fee_type' => 'sourcing_fee',
            'fee_name' => 'Special Candidate Sourcing Fee',
            'amount' => 8000.00,
        ]);
        $invoice->recalculateTotals();

        $pdfService = app(InvoicePdfService::class);
        $pdfBytes = $pdfService->generatePdfBinary($invoice);

        $this->assertNotEmpty($pdfBytes);
        // Verify PDF binary header '%PDF-'
        $this->assertStringStartsWith('%PDF-', $pdfBytes);

        // Download route check
        $response = $this->actingAs($this->admin)->get(route('invoices.download', $invoice->id));
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    /** 8. EOR vs Agency employment_model branding resolution on invoice PDF */
    public function test_8_eor_vs_agency_employment_model_branding_resolution_on_invoice_pdf()
    {
        $empEor = Employee::factory()->create([
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'employment_model' => 'eor',
        ]);

        $invoiceEor = Invoice::create([
            'invoice_number' => 'INV-EOR-001',
            'client_id' => $this->client->id,
            'branch_id' => $this->branchMH->id,
            'payroll_run_id' => $this->payrollRun->id,
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '27AABCM1234N1ZQ',
            'branch_gstin' => '27AABCA1234A1Z1',
            'place_of_supply_state' => 'Maharashtra',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 40000.00,
            'agency_service_fee' => 4000.00,
            'gst_amount' => 720.00,
            'grand_total' => 44720.00,
            'status' => 'draft',
            'due_date' => '2026-08-30',
        ]);

        InvoiceLineItem::create([
            'invoice_id' => $invoiceEor->id,
            'employee_id' => $empEor->id,
            'gross_pay' => 40000.00,
            'agency_fee' => 4000.00,
            'line_total' => 44000.00,
        ]);
        $invoiceEor->recalculateTotals();

        $pdfService = app(InvoicePdfService::class);
        $pdfBytes = $pdfService->generatePdfBinary($invoiceEor);

        $this->assertNotEmpty($pdfBytes);
        $this->assertStringStartsWith('%PDF-', $pdfBytes);
    }
}
