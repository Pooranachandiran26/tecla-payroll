<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Services\Reports\PayrollReportService;

class MonthlyPayrollRegisterTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected Employee $emp1;
    protected Employee $emp2;
    protected PayrollRun $run1;
    protected PayrollRun $run2;
    protected User $admin;
    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create 2 Clients and Branches
        $this->client1 = Client::factory()->create(['company_name' => 'Alpha Corp', 'status' => 'active']);
        $branch1 = ClientBranch::factory()->create(['client_id' => $this->client1->id]);

        $this->client2 = Client::factory()->create(['company_name' => 'Beta Logistics', 'status' => 'active']);
        $branch2 = ClientBranch::factory()->create(['client_id' => $this->client2->id]);

        // 2. Create 2 Employees with known PII values
        $this->emp1 = Employee::factory()->create([
            'client_id' => $this->client1->id,
            'branch_id' => $branch1->id,
            'full_name' => 'Rajesh Su',
            'employee_code' => 'EMP-001',
            'bank_account_number' => '8147282913',
            'pan_number' => 'PBSPS0913E',
            'aadhaar_number' => '999900000001',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'full_name' => 'Prem S',
            'employee_code' => 'EMP-002',
            'bank_account_number' => '8147282914',
            'pan_number' => 'PBSPS0913Q',
            'aadhaar_number' => '999900000002',
        ]);

        // 3. Create Payroll Runs & Items
        $this->run1 = PayrollRun::create([
            'client_id' => $this->client1->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 50000.00,
            'total_net_disbursement' => 45000.00,
            'total_employer_statutory_cost' => 3000.00,
            'total_employees_processed' => 1,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $this->run1->id,
            'employee_id' => $this->emp1->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 30000.00,
            'hra' => 15000.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 5000.00,
            'other_additions' => 0.00,
            'gross_total' => 50000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 375.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 1000.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 46605.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.00,
            'employer_eps' => 1250.00,
            'employer_esi' => 1625.00,
            'employer_lwf' => 40.00,
            'attendance_source' => 'upload',
            'is_excluded' => false,
        ]);
        $this->run1->update(['status' => 'locked']);

        $this->run2 = PayrollRun::create([
            'client_id' => $this->client2->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 40000.00,
            'total_net_disbursement' => 36000.00,
            'total_employer_statutory_cost' => 2500.00,
            'total_employees_processed' => 1,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $this->run2->id,
            'employee_id' => $this->emp2->id,
            'paid_days' => 30,
            'lop_days' => 0,
            'basic_pay' => 25000.00,
            'hra' => 10000.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 5000.00,
            'other_additions' => 0.00,
            'gross_total' => 40000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 300.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 0.00,
            'tds_deduction' => 500.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 37180.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.00,
            'employer_eps' => 1250.00,
            'employer_esi' => 1300.00,
            'employer_lwf' => 40.00,
            'attendance_source' => 'upload',
            'is_excluded' => false,
        ]);
        $this->run2->update(['status' => 'locked']);

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
     * Test 1: Admin sees ALL clients in Payroll Register
     */
    public function test_1_admin_sees_all_clients_in_payroll_register()
    {
        $service = new PayrollReportService();
        $rows = $service->runForExport(['month' => '2026-07-01'], $this->admin);

        $this->assertCount(2, $rows);
        $clientNames = $rows->pluck('client_name')->toArray();
        $this->assertContains('Alpha Corp', $clientNames);
        $this->assertContains('Beta Logistics', $clientNames);
    }

    /**
     * Test 2: Manager sees ONLY assigned client rows (Alpha Corp)
     */
    public function test_2_manager_sees_only_assigned_client_rows()
    {
        $service = new PayrollReportService();
        $rows = $service->runForExport(['month' => '2026-07-01'], $this->manager);

        $this->assertCount(1, $rows);
        $this->assertEquals('Alpha Corp', $rows->first()['client_name']);
        $this->assertEquals('Rajesh Su', $rows->first()['employee_name']);
    }

    /**
     * Test 3: PII Masking — Manager sees ******2913 / PB******3E, Admin sees raw values
     */
    public function test_3_pii_masking_difference_between_admin_and_manager()
    {
        $service = new PayrollReportService();

        // Admin gets raw unmasked values
        $adminRows = $service->runForExport(['month' => '2026-07-01'], $this->admin);
        $adminRow = $adminRows->firstWhere('employee_name', 'Rajesh Su');
        $this->assertEquals('8147282913', $adminRow['bank_account_number']);
        $this->assertEquals('PBSPS0913E', $adminRow['pan_number']);

        // Manager gets exact masked format ******2913 / PB******3E
        $managerRows = $service->runForExport(['month' => '2026-07-01'], $this->manager);
        $managerRow = $managerRows->firstWhere('employee_name', 'Rajesh Su');
        $this->assertEquals('******2913', $managerRow['bank_account_number']);
        $this->assertEquals('PB******3E', $managerRow['pan_number']);
    }

    /**
     * Test 4: CTC Arithmetic correctness — Gross + Er PF + Er ESI + Er LWF
     */
    public function test_4_total_ctc_arithmetic_correctness()
    {
        $service = new PayrollReportService();
        $rows = $service->runForExport(['month' => '2026-07-01'], $this->admin);
        $row = $rows->firstWhere('employee_name', 'Rajesh Su');

        // Gross: 50000, Er PF: 1950, Er ESI: 1625, Er LWF: 40
        // Expected Er Statutory: 1950 + 1625 + 40 = 3615.00
        // Expected Total CTC: 50000 + 3615 = 53615.00
        $this->assertEquals(50000.00, $row['gross_total']);
        $this->assertEquals(1950.00, $row['employer_pf']);
        $this->assertEquals(1625.00, $row['employer_esi']);
        $this->assertEquals(40.00, $row['employer_lwf']);
        $this->assertEquals(3615.00, $row['total_employer_statutory']);
        $this->assertEquals(53615.00, $row['total_ctc']);
    }

    /**
     * Test 5: Streamed CSV Export response header, Content-Type, and row counts
     */
    public function test_5_csv_export_response_and_headers()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/payroll_register/export?month=2026-07-01');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        
        $content = $response->streamedContent();
        $this->assertStringContainsString('Month,"Client Name","Emp Code","Employee Name"', $content);
        $this->assertStringContainsString('Alpha Corp', $content);
        $this->assertStringContainsString('Beta Logistics', $content);
        $this->assertStringContainsString('Rajesh Su', $content);

        // Count lines in CSV (1 header + 2 data rows = 3 lines minimum)
        $lines = explode("\n", trim($content));
        $this->assertGreaterThanOrEqual(3, count($lines));
    }
}
