<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\Invoice;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InvoicePaymentLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected ClientBranch $branch1;
    protected ClientBranch $branch2;
    protected PayrollRun $payrollRun;
    protected User $adminUser;
    protected User $managerUser;
    protected Invoice $invoice1;
    protected Invoice $invoice2;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Clients
        $this->client1 = Client::create([
            'company_name' => 'Acme Corp',
            'client_code' => 'ACME01',
            'contract_type' => 'agency',
            'contract_start_date' => now()->subMonth()->toDateString(),
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 50000,
            'credit_limit' => 100000,
            'primary_poc_name' => 'John Doe',
            'primary_poc_email' => 'john@acme.com',
            'primary_poc_phone' => '9876543210',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '100 Main St',
            'registered_city' => 'Bengaluru',
            'registered_state' => 'Karnataka',
            'registered_pin' => '560001',
        ]);

        $this->client2 = Client::create([
            'company_name' => 'Beta Industries',
            'client_code' => 'BETA02',
            'contract_type' => 'agency',
            'contract_start_date' => now()->subMonth()->toDateString(),
            'billing_model' => 'fixed_per_month',
            'fixed_fee_amount' => 60000,
            'credit_limit' => 150000,
            'primary_poc_name' => 'Jane Smith',
            'primary_poc_email' => 'jane@beta.com',
            'primary_poc_phone' => '9876543211',
            'company_type' => 'pvt_ltd',
            'registered_address_line_1' => '200 Park Ave',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'registered_pin' => '400001',
        ]);

        // Create Branches
        $this->branch1 = ClientBranch::create([
            'client_id' => $this->client1->id,
            'branch_name' => 'Bengaluru HQ',
            'branch_code' => 'ACME-BLR',
            'state' => 'Karnataka',
            'gstin' => '29AAACM1234N1Z1',
            'is_head_office' => true,
        ]);

        $this->branch2 = ClientBranch::create([
            'client_id' => $this->client2->id,
            'branch_name' => 'Mumbai Office',
            'branch_code' => 'BETA-MUM',
            'state' => 'Maharashtra',
            'gstin' => '27AAABM9999N1Z2',
            'is_head_office' => true,
        ]);

        // Create PayrollRun
        $this->payrollRun = PayrollRun::create([
            'client_id' => $this->client1->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 1,
            'total_gross_earnings' => 40000.00,
            'total_net_disbursement' => 35000.00,
        ]);

        // Create Users
        $this->adminUser = User::create([
            'name' => 'Admin User',
            'email' => 'admin@tecla.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->managerUser = User::create([
            'name' => 'Manager User',
            'email' => 'manager@tecla.com',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'status' => 'active',
        ]);

        // Assign client1 to managerUser
        $this->managerUser->managedClients()->attach($this->client1->id);

        // Create Invoices for client1
        $this->invoice1 = Invoice::create([
            'client_id' => $this->client1->id,
            'branch_id' => $this->branch1->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '29AABCT1234N1ZQ',
            'branch_gstin' => $this->branch1->gstin,
            'invoice_number' => 'INV-2026-001',
            'invoice_month' => '2026-07-01',
            'due_date' => '2026-08-15',
            'status' => 'sent',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 40000.00,
            'agency_service_fee' => 5000.00,
            'gst_amount' => 900.00,
            'grand_total' => 45900.00,
            'place_of_supply_state' => 'Karnataka',
        ]);

        // Create Invoice for client2
        $this->invoice2 = Invoice::create([
            'client_id' => $this->client2->id,
            'branch_id' => $this->branch2->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '27AABCT1234N1ZQ',
            'branch_gstin' => $this->branch2->gstin,
            'invoice_number' => 'INV-2026-002',
            'invoice_month' => '2026-07-01',
            'due_date' => '2026-08-15',
            'status' => 'sent',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 50000.00,
            'agency_service_fee' => 6000.00,
            'gst_amount' => 1080.00,
            'grand_total' => 57080.00,
            'place_of_supply_state' => 'Maharashtra',
        ]);
    }

    /**
     * TEST 1: Draft Invoice cannot be marked as paid (422 Error Guard).
     */
    public function test_draft_invoice_cannot_be_marked_as_paid(): void
    {
        $draftInvoice = Invoice::create([
            'client_id' => $this->client1->id,
            'branch_id' => $this->branch1->id,
            'payroll_run_id' => $this->payrollRun->id,
            'agency_gstin' => '29AABCT1234N1ZQ',
            'branch_gstin' => $this->branch1->gstin,
            'invoice_number' => 'INV-2026-DRAFT',
            'invoice_month' => '2026-07-01',
            'due_date' => '2026-08-15',
            'status' => 'draft',
            'gst_type' => 'cgst_sgst',
            'gross_salary_passthrough' => 10000.00,
            'agency_service_fee' => 1000.00,
            'gst_amount' => 180.00,
            'grand_total' => 11180.00,
            'place_of_supply_state' => 'Karnataka',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson("/invoices/{$draftInvoice->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 11180.00,
                'payment_mode' => 'neft_rtgs',
            ]);

        $response->assertStatus(422);
        $response->assertJson(['error' => 'Cannot mark a draft invoice as paid. Please finalize the invoice first.']);
        $this->assertEquals('draft', $draftInvoice->fresh()->status);
    }

    /**
     * TEST 2: Admin marks invoice paid -> status = 'paid', AuditLog created.
     */
    public function test_admin_marks_invoice_as_paid_successfully(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson("/invoices/{$this->invoice1->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 45900.00,
                'payment_mode' => 'neft_rtgs',
                'transaction_reference' => 'UTR9988776655',
                'remarks' => 'Received full payment via HDFC Bank NEFT',
            ]);

        $response->assertStatus(200);

        $freshInvoice = $this->invoice1->fresh();
        $this->assertEquals('paid', $freshInvoice->status);
        $this->assertEquals(45900.00, (float)$freshInvoice->paid_amount);
        $this->assertEquals('neft_rtgs', $freshInvoice->payment_mode);
        $this->assertEquals('UTR9988776655', $freshInvoice->transaction_reference);

        // Audit Log verification
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice_marked_paid',
            'user_id' => $this->adminUser->id,
        ]);
    }

    /**
     * TEST 3: Scoped Manager marks their OWN client's invoice paid -> succeeds.
     */
    public function test_scoped_manager_marks_own_client_invoice_as_paid(): void
    {
        $response = $this->actingAs($this->managerUser)
            ->postJson("/invoices/{$this->invoice1->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 45900.00,
                'payment_mode' => 'cheque',
                'transaction_reference' => 'CHQ-001928',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('paid', $this->invoice1->fresh()->status);
    }

    /**
     * TEST 4: Manager attempts to mark a DIFFERENT client's invoice paid -> 403 Forbidden (IDOR Guard).
     */
    public function test_manager_cannot_mark_unmanaged_client_invoice_paid_idor(): void
    {
        $response = $this->actingAs($this->managerUser)
            ->postJson("/invoices/{$this->invoice2->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 57080.00,
                'payment_mode' => 'neft_rtgs',
            ]);

        $response->assertStatus(403);
        $this->assertEquals('sent', $this->invoice2->fresh()->status);
    }

    /**
     * TEST 5: Overdue invoice correctly transitions to paid.
     */
    public function test_overdue_invoice_transitions_to_paid(): void
    {
        $this->invoice1->update(['status' => 'overdue', 'due_date' => '2026-07-15']);

        $response = $this->actingAs($this->adminUser)
            ->postJson("/invoices/{$this->invoice1->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 45900.00,
                'payment_mode' => 'bank_transfer',
            ]);

        $response->assertStatus(200);
        $this->assertEquals('paid', $this->invoice1->fresh()->status);
    }

    /**
     * TEST 6: Credit Limit / Outstanding calculation correctly excludes paid invoices (DB proof).
     */
    public function test_credit_limit_outstanding_calculation_excludes_paid_invoices(): void
    {
        // Total outstanding BEFORE marking paid
        $outstandingBefore = Invoice::where('client_id', $this->client1->id)
            ->whereIn('status', ['draft', 'finalized', 'raised', 'sent', 'overdue', 'partially_paid'])
            ->sum('grand_total');

        $this->assertEquals(45900.00, (float)$outstandingBefore);

        // Mark invoice1 paid
        $this->actingAs($this->adminUser)
            ->postJson("/invoices/{$this->invoice1->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 45900.00,
                'payment_mode' => 'neft_rtgs',
            ]);

        // Total outstanding AFTER marking paid
        $outstandingAfter = Invoice::where('client_id', $this->client1->id)
            ->whereIn('status', ['draft', 'finalized', 'raised', 'sent', 'overdue', 'partially_paid'])
            ->sum('grand_total');

        $this->assertEquals(0.00, (float)$outstandingAfter);
    }

    /**
     * TEST 7: Partial payment scenario -> sets status to 'partially_paid', remaining balance stays in outstanding total.
     */
    public function test_partial_payment_scenario_sets_partially_paid_status(): void
    {
        // Invoice total is 45,900. Pay partial 20,000
        $response = $this->actingAs($this->adminUser)
            ->postJson("/invoices/{$this->invoice1->id}/mark-paid", [
                'payment_date' => '2026-08-01',
                'amount_received' => 20000.00,
                'payment_mode' => 'upi',
                'transaction_reference' => 'UPI-987654321',
            ]);

        $response->assertStatus(200);

        $freshInvoice = $this->invoice1->fresh();
        $this->assertEquals('partially_paid', $freshInvoice->status);
        $this->assertEquals(20000.00, (float)$freshInvoice->paid_amount);

        // Verify it STILL remains in outstanding calculation because status is 'partially_paid'
        $outstanding = Invoice::where('client_id', $this->client1->id)
            ->whereIn('status', ['draft', 'finalized', 'raised', 'sent', 'overdue', 'partially_paid'])
            ->sum('grand_total');

        $this->assertEquals(45900.00, (float)$outstanding);
    }
}
