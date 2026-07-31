<?php

namespace Tests\Feature\Reports;

use App\Models\Client;
use App\Models\Employee;
use App\Models\User;
use App\Services\Reports\StatutoryProfileReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\ClientBranch;

class StatutoryProfileReportTest extends TestCase
{
    use RefreshDatabase;

    protected Client $client1;
    protected Client $client2;
    protected Employee $emp1;
    protected Employee $emp2;
    protected User $admin;
    protected User $manager1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client1 = Client::factory()->create(['company_name' => 'Tecla Media', 'status' => 'active']);
        $branch1 = ClientBranch::factory()->create(['client_id' => $this->client1->id]);

        $this->client2 = Client::factory()->create(['company_name' => 'TCS Global', 'status' => 'active']);
        $branch2 = ClientBranch::factory()->create(['client_id' => $this->client2->id]);

        $this->emp1 = Employee::factory()->create([
            'client_id' => $this->client1->id,
            'branch_id' => $branch1->id,
            'employee_code' => 'TEC-001',
            'full_name' => 'Rajesh Su',
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '123456789012',
            'bank_account_number' => '8147282913',
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => true,
            'lwf_applicable' => true,
            'eps_applicable' => true,
            'uan_number' => '101299887766',
            'esic_number' => '312299887766',
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'employee_code' => 'TCS-002',
            'full_name' => 'Anita Sen',
            'pan_number' => 'XYZDE5678G',
            'aadhaar_number' => '987654321098',
            'bank_account_number' => '9876543210',
            'pf_applicable' => true,
            'esi_applicable' => true,
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);
    }

    public function test_1_pii_masking_same_record_side_by_side()
    {
        $svc = new StatutoryProfileReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $adminSample = $adminRows->firstWhere('employee_code', 'TEC-001');
        $mgrSample   = $mgrRows->firstWhere('employee_code', 'TEC-001');

        $this->assertNotNull($adminSample);
        $this->assertNotNull($mgrSample);

        $this->assertEquals('101299887766', $adminSample['uan_number']);
        $this->assertEquals('********7766', $mgrSample['uan_number']);
    }

    public function test_2_statutory_profile_scoping_exclusion()
    {
        $svc = new StatutoryProfileReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $this->assertCount(2, $adminRows);
        $this->assertCount(1, $mgrRows);
        $this->assertEquals('TEC-001', $mgrRows->first()['employee_code']);
    }

    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/statutory_profile/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/statutory_profile/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
