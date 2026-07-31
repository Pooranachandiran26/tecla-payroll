<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Services\Reports\LoanStatementReportService;

class LoanStatementReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected Employee $emp1;
    protected Employee $emp2;
    protected User $admin;
    protected User $managerA;
    protected User $managerB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client1 = Client::factory()->create(['company_name' => 'Alpha Corp', 'status' => 'active']);
        $branch1 = ClientBranch::factory()->create(['client_id' => $this->client1->id]);

        $this->client2 = Client::factory()->create(['company_name' => 'Beta Logistics', 'status' => 'active']);
        $branch2 = ClientBranch::factory()->create(['client_id' => $this->client2->id]);

        $this->emp1 = Employee::factory()->create([
            'client_id' => $this->client1->id,
            'branch_id' => $branch1->id,
            'full_name' => 'Rajesh Su',
            'employee_code' => 'EMP-001',
            'bank_account_number' => '8147282913',
            'pan_number' => 'PBSPS0913E',
            'aadhaar_number' => '444400000001',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'full_name' => 'Prem S',
            'employee_code' => 'EMP-002',
            'bank_account_number' => '8147282914',
            'pan_number' => 'PBSPS0913Q',
            'aadhaar_number' => '444400000002',
        ]);

        EmployeeLoan::create([
            'employee_id' => $this->emp1->id,
            'loan_number' => 'LN-00001',
            'loan_type' => 'company_loan',
            'principal_amount' => 50000.00,
            'monthly_emi' => 5000.00,
            'total_repaid' => 15000.00,
            'remaining_balance' => 35000.00,
            'status' => 'active',
            'start_date' => '2026-04-01',
        ]);

        EmployeeLoan::create([
            'employee_id' => $this->emp2->id,
            'loan_number' => 'LN-00002',
            'loan_type' => 'salary_advance',
            'principal_amount' => 20000.00,
            'monthly_emi' => 2000.00,
            'total_repaid' => 20000.00,
            'remaining_balance' => 0.00,
            'status' => 'completed',
            'start_date' => '2026-05-01',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->managerA = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerA->managedClients()->attach([$this->client1->id]);

        $this->managerB = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerB->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: Loan Statement Scoping — Manager A sees only Alpha Corp, Manager B sees only Beta Logistics
     */
    public function test_1_loan_statement_scoping()
    {
        $service = new LoanStatementReportService();

        $adminRows = $service->runForExport([], $this->admin);
        $this->assertCount(2, $adminRows);

        $managerARows = $service->runForExport([], $this->managerA);
        $this->assertCount(1, $managerARows);
        $this->assertEquals('Alpha Corp', $managerARows->first()['client_name']);

        $managerBRows = $service->runForExport([], $this->managerB);
        $this->assertCount(1, $managerBRows);
        $this->assertEquals('Beta Logistics', $managerBRows->first()['client_name']);
    }

    /**
     * Test 2: Principal, Repaid, and Remaining Balance Arithmetic Correctness
     */
    public function test_2_loan_balance_arithmetic()
    {
        $service = new LoanStatementReportService();
        $rows = $service->runForExport([], $this->admin);

        $row1 = $rows->firstWhere('employee_code', 'EMP-001');
        $this->assertEquals(50000.00, $row1['principal_amount']);
        $this->assertEquals(15000.00, $row1['total_repaid']);
        $this->assertEquals(35000.00, $row1['remaining_balance']);
    }

    /**
     * Test 3: CSV Export response
     */
    public function test_3_csv_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/loan_statement/export');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Loan Ref', $content);
        $this->assertStringContainsString('EMP-001', $content);
    }

    /**
     * Test 4: PDF Export response and binary header
     */
    public function test_4_pdf_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/loan_statement/pdf');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');

        $content = $response->streamedContent();
        $this->assertStringStartsWith('%PDF-', $content);
    }
}
