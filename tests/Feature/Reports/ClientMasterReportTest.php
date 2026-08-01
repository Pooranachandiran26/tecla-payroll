<?php

namespace Tests\Feature\Reports;

use App\Models\Client;
use App\Models\User;
use App\Services\Reports\ClientMasterReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientMasterReportTest extends TestCase
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

        $this->client1 = Client::factory()->create([
            'company_name' => 'Tecla Media',
            'client_code' => 'TEC-001',
            'billing_model' => 'markup',
            'markup_percentage' => 8.50,
            'status' => 'active',
        ]);

        $this->client2 = Client::factory()->create([
            'company_name' => 'TCS Global',
            'client_code' => 'TCS-002',
            'billing_model' => 'fixed_per_candidate',
            'fixed_fee_amount' => 500.00,
            'status' => 'active',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);

        $this->manager2 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager2->managedClients()->attach([$this->client2->id]);
    }

    public function test_1_admin_sees_all_clients()
    {
        $svc = new ClientMasterReportService();
        $rows = $svc->runForExport([], $this->admin);

        $this->assertCount(2, $rows);
    }

    public function test_2_manager_scoping_exclusion()
    {
        $svc = new ClientMasterReportService();

        $mgr1Rows = $svc->runForExport([], $this->manager1);
        $mgr2Rows = $svc->runForExport([], $this->manager2);

        $this->assertCount(1, $mgr1Rows);
        $this->assertEquals('Tecla Media', $mgr1Rows->first()['company_name']);

        $this->assertCount(1, $mgr2Rows);
        $this->assertEquals('TCS Global', $mgr2Rows->first()['company_name']);
    }

    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/client_master/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/client_master/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
