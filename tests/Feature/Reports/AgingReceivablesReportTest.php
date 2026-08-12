<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Services\Reports\AgingReceivablesReportService;

class AgingReceivablesReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected Invoice $inv1;
    protected Invoice $inv2;
    protected User $admin;
    protected User $manager1;
    protected User $manager2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client1 = Client::factory()->create(['company_name' => 'Tecla Media', 'status' => 'active']);
        $this->client2 = Client::factory()->create(['company_name' => 'TCS Global', 'status' => 'active']);

        $branch1 = ClientBranch::factory()->create(['client_id' => $this->client1->id]);
        $branch2 = ClientBranch::factory()->create(['client_id' => $this->client2->id]);

        $today = now()->startOfDay();

        $run1 = PayrollRun::create([
            'client_id' => $this->client1->id,
            'payroll_month' => '2026-06-01',
            'status' => 'locked',
            'total_gross_earnings' => 100000.00,
            'total_net_disbursement' => 90000.00,
            'total_employer_statutory_cost' => 0.00,
            'total_employees_processed' => 1,
        ]);

        $run2 = PayrollRun::create([
            'client_id' => $this->client2->id,
            'payroll_month' => '2026-05-01',
            'status' => 'locked',
            'total_gross_earnings' => 200000.00,
            'total_net_disbursement' => 180000.00,
            'total_employer_statutory_cost' => 0.00,
            'total_employees_processed' => 1,
        ]);

        // Inv 1: Due 15 days ago => 15 Days Overdue (0-30 Days Bucket)
        $this->inv1 = Invoice::create([
            'client_id' => $this->client1->id,
            'branch_id' => $branch1->id,
            'payroll_run_id' => $run1->id,
            'invoice_number' => 'INV-202607-9-1',
            'invoice_month' => '2026-06-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 100000.00,
            'agency_service_fee' => 10000.00,
            'gst_amount' => 1800.00,
            'grand_total' => 111800.00,
            'status' => 'overdue',
            'due_date' => $today->copy()->subDays(15)->toDateString(),
        ]);

        // Inv 2: Due 75 days ago => 75 Days Overdue (61-90 Days Bucket)
        $this->inv2 = Invoice::create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'payroll_run_id' => $run2->id,
            'invoice_number' => 'INV-202607-9-2',
            'invoice_month' => '2026-05-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 200000.00,
            'agency_service_fee' => 20000.00,
            'gst_amount' => 3600.00,
            'grand_total' => 223600.00,
            'status' => 'overdue',
            'due_date' => $today->copy()->subDays(75)->toDateString(),
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);

        $this->manager2 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager2->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: Manager Margin Lock on SAME INVOICE (INV-202607-9-1)
     */
    public function test_1_margin_lock_same_invoice_side_by_side()
    {
        $svc = new AgingReceivablesReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $adminSample = $adminRows->firstWhere('invoice_number', 'INV-202607-9-1');
        $mgrSample   = $mgrRows->firstWhere('invoice_number', 'INV-202607-9-1');

        $this->assertNotNull($adminSample);
        $this->assertNotNull($mgrSample);

        $this->assertEquals(10000.00, $adminSample['agency_fee']);
        $this->assertEquals('N/A (Admin Only)', $mgrSample['agency_fee']);
        $this->assertEquals(111800.00, $mgrSample['grand_total']);
    }

    /**
     * Test 2: Scoping (Manager 1 sees Client 1, Manager 2 sees Client 2)
     */
    public function test_2_aging_scoping_exclusion()
    {
        $svc = new AgingReceivablesReportService();

        $mgr1Rows = $svc->runForExport([], $this->manager1);
        $mgr2Rows = $svc->runForExport([], $this->manager2);

        $this->assertCount(1, $mgr1Rows);
        $this->assertEquals('INV-202607-9-1', $mgr1Rows->first()['invoice_number']);

        $this->assertCount(1, $mgr2Rows);
        $this->assertEquals('INV-202607-9-2', $mgr2Rows->first()['invoice_number']);
    }

    /**
     * Test 3: Days Overdue and Aging Bucketing Math
     */
    public function test_3_aging_bucketing_math()
    {
        $svc = new AgingReceivablesReportService();
        $adminRows = $svc->runForExport([], $this->admin);

        $row1 = $adminRows->firstWhere('invoice_number', 'INV-202607-9-1');
        $row2 = $adminRows->firstWhere('invoice_number', 'INV-202607-9-2');

        $this->assertEquals(15, $row1['days_overdue']);
        $this->assertEquals('0–30 Days', $row1['aging_bucket']);

        $this->assertEquals(75, $row2['days_overdue']);
        $this->assertEquals('61–90 Days', $row2['aging_bucket']);
    }

    /**
     * Test 4: CSV Export Response
     */
    public function test_4_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/aging_receivables/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    /**
     * Test 5: PDF Export Response
     */
    public function test_5_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/aging_receivables/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
