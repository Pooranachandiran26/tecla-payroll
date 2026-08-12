<?php

namespace Tests\Feature\Reports;

use App\Models\Client;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\Reports\PayrollCycleStatusReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCycleStatusReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected PayrollRun $run1;
    protected PayrollRun $run2;
    protected User $admin;
    protected User $manager1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client1 = Client::factory()->create(['company_name' => 'Tecla Media', 'status' => 'active']);
        $this->client2 = Client::factory()->create(['company_name' => 'TCS Global', 'status' => 'active']);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->run1 = PayrollRun::create([
            'client_id' => $this->client1->id,
            'payroll_month' => '2026-07-01',
            'status' => 'locked',
            'total_gross_earnings' => 100000.00,
            'total_net_disbursement' => 90000.00,
            'total_employer_statutory_cost' => 5000.00,
            'total_employees_processed' => 10,
            'processed_by' => $this->admin->id,
        ]);

        $this->run2 = PayrollRun::create([
            'client_id' => $this->client2->id,
            'payroll_month' => '2026-07-01',
            'status' => 'approved',
            'total_gross_earnings' => 200000.00,
            'total_net_disbursement' => 180000.00,
            'total_employer_statutory_cost' => 10000.00,
            'total_employees_processed' => 20,
        ]);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);
    }

    public function test_1_cycle_status_data_correctness()
    {
        $svc = new PayrollCycleStatusReportService();
        $adminRows = $svc->runForExport([], $this->admin);

        $sample = $adminRows->firstWhere('client_name', 'Tecla Media');

        $this->assertNotNull($sample);
        $this->assertEquals('LOCKED', $sample['cycle_status']);
        $this->assertEquals(10, $sample['employees_processed']);
        $this->assertEquals(100000.00, $sample['gross_earnings']);
    }

    public function test_2_cycle_status_scoping_exclusion()
    {
        $svc = new PayrollCycleStatusReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $this->assertCount(2, $adminRows);
        $this->assertCount(1, $mgrRows);
        $this->assertEquals('Tecla Media', $mgrRows->first()['client_name']);
    }

    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/payroll_cycle_status/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/payroll_cycle_status/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
