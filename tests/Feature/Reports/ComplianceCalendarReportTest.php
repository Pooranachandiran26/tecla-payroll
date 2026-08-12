<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ComplianceFiling;
use App\Services\Reports\ComplianceCalendarReportService;

class ComplianceCalendarReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected User $admin;
    protected User $manager1;
    protected User $manager2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client1 = Client::factory()->create(['company_name' => 'Tecla Media', 'status' => 'active']);
        $this->client2 = Client::factory()->create(['company_name' => 'TCS Global', 'status' => 'active']);

        ComplianceFiling::create([
            'client_id' => $this->client1->id,
            'statute' => 'pf',
            'period' => '2026-07-01',
            'status' => 'filed',
            'filed_at' => '2026-07-14 10:00:00',
        ]);

        ComplianceFiling::create([
            'client_id' => $this->client2->id,
            'statute' => 'esi',
            'period' => '2026-07-01',
            'status' => 'pending',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);

        $this->manager2 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager2->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: Statutory Due Date Calculation (PF -> 15th of month following period)
     */
    public function test_1_statutory_due_date_calculation()
    {
        $svc = new ComplianceCalendarReportService();
        $rows = $svc->runForExport([], $this->admin);

        $pfRow = $rows->firstWhere('statute', 'PF');
        $this->assertNotNull($pfRow);
        $this->assertEquals('15 Aug 2026', $pfRow['due_date']);
        $this->assertEquals('Filed', $pfRow['status']);
    }

    /**
     * Test 2: Manager Scoping Exclusion (Manager 1 sees Client 1, Manager 2 sees Client 2)
     */
    public function test_2_compliance_scoping_exclusion()
    {
        $svc = new ComplianceCalendarReportService();

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
        $res = $this->actingAs($this->admin)->get('/admin/reports/compliance_calendar/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    /**
     * Test 4: PDF Export Response
     */
    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/compliance_calendar/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
