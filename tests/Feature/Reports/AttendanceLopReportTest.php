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
use App\Services\Reports\AttendanceLopReportService;

class AttendanceLopReportTest extends TestCase
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
            'aadhaar_number' => '333300000001',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'full_name' => 'Prem S',
            'employee_code' => 'EMP-002',
            'bank_account_number' => '8147282914',
            'pan_number' => 'PBSPS0913Q',
            'aadhaar_number' => '333300000002',
        ]);

        $run1 = PayrollRun::create([
            'client_id' => $this->client1->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 50000.00,
            'total_net_disbursement' => 45000.00,
            'total_employer_statutory_cost' => 3000.00,
            'total_employees_processed' => 1,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run1->id,
            'employee_id' => $this->emp1->id,
            'paid_days' => 28,
            'lop_days' => 2,
            'basic_pay' => 28000.00,
            'hra' => 14000.00,
            'conveyance' => 0.00,
            'da' => 0.00,
            'medical_allowance' => 0.00,
            'special_allowance' => 4000.00,
            'other_additions' => 0.00,
            'gross_total' => 46000.00,
            'employee_pf' => 1800.00,
            'employee_esi' => 345.00,
            'professional_tax' => 200.00,
            'lwf_deduction' => 20.00,
            'lop_deduction' => 4000.00,
            'tds_deduction' => 1000.00,
            'loan_emi_deduction' => 0.00,
            'net_pay' => 42635.00,
            'employer_pf' => 1950.00,
            'employer_epf' => 550.00,
            'employer_eps' => 1250.00,
            'employer_esi' => 1495.00,
            'employer_lwf' => 40.00,
            'attendance_source' => 'upload',
            'is_excluded' => false,
        ]);
        $run1->update(['status' => 'locked']);

        $run2 = PayrollRun::create([
            'client_id' => $this->client2->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_gross_earnings' => 40000.00,
            'total_net_disbursement' => 36000.00,
            'total_employer_statutory_cost' => 2500.00,
            'total_employees_processed' => 1,
        ]);

        PayrollRunItem::create([
            'payroll_run_id' => $run2->id,
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
        $run2->update(['status' => 'locked']);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->managerA = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerA->managedClients()->attach([$this->client1->id]);

        $this->managerB = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerB->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: Attendance LOP scoping — Manager A sees only Alpha Corp, Manager B sees only Beta Logistics
     */
    public function test_1_attendance_lop_scoping()
    {
        $service = new AttendanceLopReportService();

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
     * Test 2: Attendance LOP Days and Deduction correctness
     */
    public function test_2_paid_and_lop_days_correctness()
    {
        $service = new AttendanceLopReportService();
        $rows = $service->runForExport([], $this->admin);

        $row1 = $rows->firstWhere('employee_code', 'EMP-001');
        $this->assertEquals(28.0, $row1['paid_days']);
        $this->assertEquals(2.0, $row1['lop_days']);
        $this->assertEquals(4000.00, $row1['lop_deduction']);
    }

    /**
     * Test 3: CSV Export response
     */
    public function test_3_csv_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/attendance_lop/export');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Month', $content);
        $this->assertStringContainsString('EMP-001', $content);
    }

    /**
     * Test 4: PDF Export response and binary header
     */
    public function test_4_pdf_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/attendance_lop/pdf');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');

        $content = $response->streamedContent();
        $this->assertStringStartsWith('%PDF-', $content);
    }
}
