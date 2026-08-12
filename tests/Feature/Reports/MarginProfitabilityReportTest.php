<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Services\Reports\MarginProfitabilityReportService;

class MarginProfitabilityReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client;
    protected Invoice $invoice;
    protected PayrollRun $run;
    protected User $admin;
    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Client and Branch
        $this->client = Client::factory()->create([
            'company_name' => 'Tecla Partner',
            'client_code' => 'TECLA',
            'status' => 'active',
        ]);
        $branch = ClientBranch::factory()->create(['client_id' => $this->client->id]);

        // 2. Create Payroll Run (Exact verified real values: Gross 6903.27, Er Stat Cost 813.54 => Passthrough 7716.81)
        $this->run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'total_gross_earnings' => 6903.27,
            'total_net_disbursement' => 6000.00,
            'total_employer_statutory_cost' => 813.54,
            'total_employees_processed' => 1,
        ]);

        // 3. Create Invoice INV-202607-1-1 (Passthrough 7716.81, Fee 345.16, GST 62.13, Grand Total 8124.10)
        $this->invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'payroll_run_id' => $this->run->id,
            'invoice_number' => 'INV-202607-1-1',
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 7716.81,
            'agency_service_fee' => 345.16,
            'gst_amount' => 62.13,
            'grand_total' => 8124.10,
            'status' => 'paid',
            'due_date' => '2026-07-25',
        ]);

        // 4. Admin User
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        // 5. Manager User
        $this->manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
        ]);
        $this->manager->managedClients()->attach([$this->client->id]);
    }

    /**
     * Test 1: Admin sees full margin data and asserts formula equivalence (grand_total - gst_amount === passthrough + fee)
     */
    public function test_1_admin_sees_margin_data_and_formula_equivalence()
    {
        $service = new MarginProfitabilityReportService();
        $rows = $service->runForExport([], $this->admin);

        $this->assertCount(1, $rows);
        $row = $rows->first();

        // Formula Equivalence Sanity Check: (grand_total - gst_amount) === (passthrough + agency_service_fee)
        $formula1 = round($this->invoice->grand_total - $this->invoice->gst_amount, 2);
        $formula2 = round($this->invoice->gross_salary_passthrough + $this->invoice->agency_service_fee, 2);

        $this->assertEquals(8061.97, $formula1);
        $this->assertEquals(8061.97, $formula2);
        $this->assertEquals($formula1, $formula2);
        $this->assertEquals(8061.97, $row['invoiced_excl_gst']);
    }

    /**
     * Test 2: Manager attempting to view (show), export CSV, or export PDF receives HTTP 403 Forbidden
     */
    public function test_2_manager_blocked_entirely_with_403_forbidden()
    {
        // Manager show view -> 403
        $responseShow = $this->actingAs($this->manager)->get('/admin/reports/margin_profitability');
        $responseShow->assertStatus(403);

        // Manager CSV export -> 403
        $responseCsv = $this->actingAs($this->manager)->get('/admin/reports/margin_profitability/export');
        $responseCsv->assertStatus(403);

        // Manager PDF export -> 403
        $responsePdf = $this->actingAs($this->manager)->get('/admin/reports/margin_profitability/pdf');
        $responsePdf->assertStatus(403);
    }

    /**
     * Test 3: Exact Margin Arithmetic for INV-202607-1-1 Fixture (Margin = 345.16, Margin % = 4.28%)
     */
    public function test_3_exact_margin_arithmetic_fixture_check()
    {
        $service = new MarginProfitabilityReportService();
        $rows = $service->runForExport([], $this->admin);
        $row = $rows->first();

        // Invoiced (Excl. GST) = 8124.10 - 62.13 = 8061.97
        $this->assertEquals(8061.97, $row['invoiced_excl_gst']);

        // Gross Earnings = 6903.27 (Non-zero distinct value)
        $this->assertEquals(6903.27, $row['gross_earnings']);

        // Employer Statutory Cost = 813.54 (Non-zero distinct value, genuinely proving subtraction in formula)
        $this->assertEquals(813.54, $row['employer_statutory_cost']);

        // True Agency Margin = 8061.97 - 6903.27 - 813.54 = 345.16
        $expectedMargin = round(8061.97 - 6903.27 - 813.54, 2);
        $this->assertEquals(345.16, $expectedMargin);
        $this->assertEquals(345.16, $row['true_agency_margin']);

        // Margin % = (345.16 / 8061.97) * 100 = 4.28%
        $this->assertEquals('4.28%', $row['margin_percentage']);
    }

    /**
     * Test 4: Admin CSV Export response and headers
     */
    public function test_4_admin_csv_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/margin_profitability/export');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Client Name', $content);
        $this->assertStringContainsString('Tecla Partner', $content);
        $this->assertStringContainsString('345.16', $content);
    }

    /**
     * Test 5: Admin PDF Export response and %PDF- header
     */
    public function test_5_admin_pdf_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/margin_profitability/pdf');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');

        $content = $response->streamedContent();
        $this->assertStringStartsWith('%PDF-', $content);
    }

    /**
     * Test 6: Zero side effects on database models
     */
    public function test_6_read_only_margin_reporting_zero_side_effects()
    {
        $initialInvCount = Invoice::count();
        $initialRunCount = PayrollRun::count();

        $service = new MarginProfitabilityReportService();
        $service->runForExport([], $this->admin);
        $service->generatePdfBinary([], $this->admin);

        $this->assertEquals($initialInvCount, Invoice::count());
        $this->assertEquals($initialRunCount, PayrollRun::count());
    }
}
