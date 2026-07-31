<?php

namespace Tests\Feature\Reports;

use App\Models\Client;
use App\Models\User;
use App\Services\Reports\ManagerAccessMatrixReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagerAccessMatrixReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $manager;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = Client::factory()->create(['company_name' => 'Tecla Media', 'status' => 'active']);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager = User::factory()->create([
            'role' => 'manager',
            'name' => 'Amit Shah',
            'email' => 'amit.manager@test.com',
            'status' => 'active',
        ]);
        $this->manager->managedClients()->attach([$this->client->id]);
    }

    public function test_1_admin_sees_manager_matrix_data()
    {
        $svc = new ManagerAccessMatrixReportService();
        $rows = $svc->runForExport([], $this->admin);

        $this->assertGreaterThanOrEqual(1, $rows->count());
        $sample = $rows->firstWhere('manager_email', 'amit.manager@test.com');

        $this->assertNotNull($sample);
        $this->assertEquals('Amit Shah', $sample['manager_name']);
        $this->assertEquals(1, $sample['assigned_clients_count']);
        $this->assertEquals('Tecla Media', $sample['assigned_client_names']);
    }

    public function test_2_manager_blocked_with_403_forbidden()
    {
        $res = $this->actingAs($this->manager)->get('/admin/reports/manager_access_matrix');
        $res->assertStatus(403);

        $resCsv = $this->actingAs($this->manager)->get('/admin/reports/manager_access_matrix/export');
        $resCsv->assertStatus(403);

        $resPdf = $this->actingAs($this->manager)->get('/admin/reports/manager_access_matrix/pdf');
        $resPdf->assertStatus(403);
    }

    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/manager_access_matrix/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/manager_access_matrix/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
