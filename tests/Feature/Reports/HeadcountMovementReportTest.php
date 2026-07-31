<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\EmployeeExit;
use App\Services\Reports\HeadcountMovementReportService;

class HeadcountMovementReportTest extends TestCase
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
            'date_of_joining' => '2026-07-01',
            'bank_account_number' => '8147282913',
            'pan_number' => 'PBSPS0913E',
            'aadhaar_number' => '666600000001',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'full_name' => 'Prem S',
            'employee_code' => 'TCS-002',
            'date_of_joining' => '2025-01-01',
            'bank_account_number' => '8147282914',
            'pan_number' => 'PBSPS0913Q',
            'aadhaar_number' => '666600000002',
        ]);

        EmployeeExit::create([
            'employee_id' => $this->emp2->id,
            'last_working_day' => '2026-07-15',
            'exit_type' => 'Resignation',
            'settlement_status' => 'approved',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);

        $this->manager2 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager2->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: PII Masking on SAME RECORD (Emp Code TEC-006)
     */
    public function test_1_pii_masking_same_record_side_by_side()
    {
        $svc = new HeadcountMovementReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $adminSample = $adminRows->firstWhere('employee_code', 'TEC-006');
        $mgrSample   = $mgrRows->firstWhere('employee_code', 'TEC-006');

        $this->assertNotNull($adminSample);
        $this->assertNotNull($mgrSample);

        $this->assertEquals('8147282913', $adminSample['bank_account_number']);
        $this->assertEquals('******2913', $mgrSample['bank_account_number']);
    }

    /**
     * Test 2: Manager Scoping Exclusion (Manager 1 sees Client 1, Manager 2 sees Client 2)
     */
    public function test_2_headcount_scoping_exclusion()
    {
        $svc = new HeadcountMovementReportService();

        $mgr1Rows = $svc->runForExport([], $this->manager1);
        $mgr2Rows = $svc->runForExport([], $this->manager2);

        $this->assertTrue($mgr1Rows->every(fn($r) => $r['client_name'] === 'Tecla Media'));
        $this->assertTrue($mgr2Rows->every(fn($r) => $r['client_name'] === 'TCS Global'));
    }

    /**
     * Test 3: CSV Export Response
     */
    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/headcount_movement/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    /**
     * Test 4: PDF Export Response
     */
    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/headcount_movement/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
