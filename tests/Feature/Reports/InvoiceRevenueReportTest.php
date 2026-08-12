<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Services\Reports\InvoiceReportService;
use Carbon\Carbon;

class InvoiceRevenueReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected Invoice $inv1;
    protected Invoice $inv2;
    protected User $admin;
    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create 2 Clients and Branches
        $this->client1 = Client::factory()->create(['company_name' => 'Alpha Corp', 'client_code' => 'ALPHA', 'status' => 'active']);
        $branch1 = ClientBranch::factory()->create(['client_id' => $this->client1->id]);

        $this->client2 = Client::factory()->create(['company_name' => 'Beta Logistics', 'client_code' => 'BETA', 'status' => 'active']);
        $branch2 = ClientBranch::factory()->create(['client_id' => $this->client2->id]);

        // 2. Create Payroll Runs
        $run1 = PayrollRun::create([
            'client_id' => $this->client1->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'total_gross_earnings' => 50000.00,
            'total_net_disbursement' => 45000.00,
            'total_employer_statutory_cost' => 3000.00,
            'total_employees_processed' => 1,
        ]);

        $run2 = PayrollRun::create([
            'client_id' => $this->client2->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'total_gross_earnings' => 40000.00,
            'total_net_disbursement' => 36000.00,
            'total_employer_statutory_cost' => 2500.00,
            'total_employees_processed' => 1,
        ]);

        // 3. Create Invoices (inv1 is overdue: due_date 2026-07-15, tested on 2026-07-31 => 16 days overdue)
        $this->inv1 = Invoice::create([
            'client_id' => $this->client1->id,
            'branch_id' => $branch1->id,
            'payroll_run_id' => $run1->id,
            'invoice_number' => 'INV-2026-001',
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 53000.00,
            'agency_service_fee' => 5000.00,
            'gst_amount' => 10440.00,
            'grand_total' => 68440.00,
            'status' => 'overdue',
            'due_date' => '2026-07-15',
            'sent_at' => '2026-07-02 10:00:00',
        ]);

        $this->inv2 = Invoice::create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'payroll_run_id' => $run2->id,
            'invoice_number' => 'INV-2026-002',
            'invoice_month' => '2026-07-01',
            'agency_gstin' => '33AAAAA0000A1Z5',
            'branch_gstin' => '33AAAAA0000A1Z5',
            'place_of_supply_state' => 'Tamil Nadu',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 42500.00,
            'agency_service_fee' => 4000.00,
            'gst_amount' => 8370.00,
            'grand_total' => 54870.00,
            'status' => 'paid',
            'due_date' => '2026-07-25',
            'sent_at' => '2026-07-02 11:00:00',
        ]);

        // 4. Admin User
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        // 5. Manager User assigned ONLY to client1 (Alpha Corp)
        $this->manager = User::factory()->create([
            'role' => 'manager',
            'status' => 'active',
        ]);
        $this->manager->managedClients()->attach([$this->client1->id]);
    }

    /**
     * Test 1: Admin sees all invoices; Manager sees ONLY assigned client invoices
     */
    public function test_1_scoping_admin_sees_all_manager_sees_assigned_only()
    {
        $service = new InvoiceReportService();

        // Admin gets all 2 invoices
        $adminRows = $service->runForExport([], $this->admin);
        $this->assertCount(2, $adminRows);

        // Manager gets only 1 invoice (Alpha Corp)
        $managerRows = $service->runForExport([], $this->manager);
        $this->assertCount(1, $managerRows);
        $this->assertEquals('INV-2026-001', $managerRows->first()['invoice_number']);
        $this->assertEquals('Alpha Corp', $managerRows->first()['client_name']);
    }

    /**
     * Test 2: Overdue calculation matches exact date difference (2026-07-15 vs 2026-07-31 = 16 days)
     */
    public function test_2_days_overdue_calculation_direction_and_magnitude()
    {
        // Fix test time to 2026-07-31
        Carbon::setTestNow(Carbon::parse('2026-07-31 12:00:00'));

        $service = new InvoiceReportService();
        $rows = $service->runForExport([], $this->admin);

        $inv1Row = $rows->firstWhere('invoice_number', 'INV-2026-001');
        $inv2Row = $rows->firstWhere('invoice_number', 'INV-2026-002');

        // Due date: 2026-07-15, Test Now: 2026-07-31 => 16 days overdue
        $this->assertEquals(16, $inv1Row['days_overdue']);

        // Due date: 2026-07-25, but status is 'paid' => 0 days overdue
        $this->assertEquals(0, $inv2Row['days_overdue']);

        Carbon::setTestNow(); // Reset test clock
    }

    /**
     * Test 3: Manager Margin Lock — Manager sees 'N/A (Admin Only)', Admin sees real numeric fee
     */
    public function test_3_manager_margin_lock_protection()
    {
        $service = new InvoiceReportService();

        // Admin sees actual agency fee (5000.00)
        $adminRows = $service->runForExport([], $this->admin);
        $adminRow = $adminRows->firstWhere('invoice_number', 'INV-2026-001');
        $this->assertEquals(5000.00, $adminRow['agency_service_fee']);

        // Manager sees masked string 'N/A (Admin Only)'
        $managerRows = $service->runForExport([], $this->manager);
        $managerRow = $managerRows->firstWhere('invoice_number', 'INV-2026-001');
        $this->assertEquals('N/A (Admin Only)', $managerRow['agency_service_fee']);
    }

    /**
     * Test 4: CSV Export — correct Content-Type, header, and row count
     */
    public function test_4_csv_export_response_and_headers()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/invoice_revenue/export');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Invoice No', $content);
        $this->assertStringContainsString('INV-2026-001', $content);
        $this->assertStringContainsString('INV-2026-002', $content);

        $lines = explode("\n", trim($content));
        $this->assertGreaterThanOrEqual(3, count($lines));
    }

    /**
     * Test 5: PDF Export — returns HTTP 200 application/pdf, contains %PDF- header
     */
    public function test_5_pdf_export_response_and_binary_header()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/invoice_revenue/pdf');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');

        $content = $response->streamedContent();
        $this->assertStringStartsWith('%PDF-', $content);
    }

    /**
     * Test 6: Zero Side-Effects on Invoice database model
     */
    public function test_6_read_only_reporting_zero_side_effects()
    {
        $initialCount = Invoice::count();

        $service = new InvoiceReportService();
        $service->runForExport([], $this->admin);
        $service->generatePdfBinary([], $this->admin);

        $this->assertEquals($initialCount, Invoice::count());
    }
}
