<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeExit;
use App\Services\Reports\FnfReportService;

class FnfReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected Employee $emp1;
    protected Employee $emp2;
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

        $this->emp1 = Employee::factory()->create([
            'client_id' => $this->client1->id,
            'branch_id' => $branch1->id,
            'full_name' => 'Rajesh Su',
            'employee_code' => 'TEC-006',
            'bank_account_number' => '8147282913',
            'pan_number' => 'PBSPS0913E',
            'aadhaar_number' => '555500000001',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'full_name' => 'Prem S',
            'employee_code' => 'TCS-002',
            'bank_account_number' => '8147282914',
            'pan_number' => 'PBSPS0913Q',
            'aadhaar_number' => '555500000002',
        ]);

        EmployeeExit::create([
            'employee_id' => $this->emp1->id,
            'last_working_day' => '2026-07-15',
            'exit_type' => 'Resignation',
            'notice_amount' => 5000.00,
            'leave_encashment_amount' => 12000.00,
            'gratuity_amount' => 25000.00,
            'loan_recovery_amount' => 0.00,
            'net_settlement_amount' => 42000.00,
            'settlement_status' => 'approved',
        ]);

        EmployeeExit::create([
            'employee_id' => $this->emp2->id,
            'last_working_day' => '2026-07-20',
            'exit_type' => 'Termination',
            'notice_amount' => 0.00,
            'leave_encashment_amount' => 5000.00,
            'gratuity_amount' => 0.00,
            'loan_recovery_amount' => 2000.00,
            'net_settlement_amount' => 3000.00,
            'settlement_status' => 'pending_approval',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);

        $this->manager2 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager2->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: Side-by-side PII Masking on SAME RECORD (Emp Code TEC-006)
     */
    public function test_1_pii_masking_same_record_side_by_side()
    {
        $svc = new FnfReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $adminSample = $adminRows->firstWhere('employee_code', 'TEC-006');
        $mgrSample   = $mgrRows->firstWhere('employee_code', 'TEC-006');

        $this->assertNotNull($adminSample);
        $this->assertNotNull($mgrSample);

        $this->assertEquals('Rajesh Su', $adminSample['employee_name']);
        $this->assertEquals('Rajesh Su', $mgrSample['employee_name']);

        $this->assertEquals('8147282913', $adminSample['bank_account_number']);
        $this->assertEquals('******2913', $mgrSample['bank_account_number']);
    }

    /**
     * Test 2: Manager Scoping (Manager 1 sees Client 1, Manager 2 sees Client 2)
     */
    public function test_2_fnf_scoping_exclusion()
    {
        $svc = new FnfReportService();

        $mgr1Rows = $svc->runForExport([], $this->manager1);
        $mgr2Rows = $svc->runForExport([], $this->manager2);

        $this->assertCount(1, $mgr1Rows);
        $this->assertEquals('Tecla Media', $mgr1Rows->first()['client_name']);

        $this->assertCount(1, $mgr2Rows);
        $this->assertEquals('TCS Global', $mgr2Rows->first()['client_name']);
    }

    /**
     * Test 3: CSV Export Response
     */
    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/fnf_register/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    /**
     * Test 4: PDF Export Response
     */
    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/fnf_register/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
