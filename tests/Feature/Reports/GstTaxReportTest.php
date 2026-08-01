<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Services\Reports\GstTaxReportService;

class GstTaxReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client;
    protected Invoice $invoice;
    protected User $admin;
    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create(['company_name' => 'Tecla Media', 'status' => 'active']);
        $branch = ClientBranch::factory()->create(['client_id' => $this->client->id]);

        $run = PayrollRun::create([
            'client_id' => $this->client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'total_gross_earnings' => 100000.00,
            'total_net_disbursement' => 90000.00,
            'total_employer_statutory_cost' => 0.00,
            'total_employees_processed' => 1,
        ]);

        $this->invoice = Invoice::create([
            'client_id' => $this->client->id,
            'branch_id' => $branch->id,
            'payroll_run_id' => $run->id,
            'invoice_number' => 'INV-202607-10-1',
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'cgst_amount' => 900.00,
            'sgst_amount' => 900.00,
            'igst_amount' => 0.00,
            'gst_amount' => 1800.00,
            'grand_total' => 111800.00,
            'status' => 'paid',
            'due_date' => '2026-07-25',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->manager = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager->managedClients()->attach([$this->client->id]);
    }

    /**
     * Test 1: Admin sees full GST tax breakdown
     */
    public function test_1_admin_sees_gst_tax_data()
    {
        $svc = new GstTaxReportService();
        $rows = $svc->runForExport([], $this->admin);

        $this->assertCount(1, $rows);
        $row = $rows->first();

        $this->assertEquals('INV-202607-10-1', $row['invoice_number']);
        $this->assertEquals(10000.00, $row['taxable_agency_fee']);
        $this->assertEquals(900.00, $row['cgst_amount']);
        $this->assertEquals(900.00, $row['sgst_amount']);
        $this->assertEquals(0.00, $row['igst_amount']);
        $this->assertEquals(1800.00, $row['total_gst_amount']);
    }

    /**
     * Test 2: Manager blocked with HTTP 403 Forbidden across all actions
     */
    public function test_2_manager_blocked_with_403_forbidden()
    {
        $this->actingAs($this->manager)->get('/admin/reports/gst_tax_summary')->assertStatus(403);
        $this->actingAs($this->manager)->get('/admin/reports/gst_tax_summary/export')->assertStatus(403);
        $this->actingAs($this->manager)->get('/admin/reports/gst_tax_summary/pdf')->assertStatus(403);
    }

    /**
     * Test 3: CSV Export Response
     */
    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/gst_tax_summary/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    /**
     * Test 4: PDF Export Response
     */
    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/gst_tax_summary/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
