<?php

namespace Tests\Feature\Reports;

use App\Models\Client;
use App\Models\Employee;
use App\Models\SalaryRevision;
use App\Models\User;
use App\Services\Reports\SalaryRevisionReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use App\Models\ClientBranch;

class SalaryRevisionReportTest extends TestCase
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
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'employee_code' => 'TCS-002',
            'full_name' => 'Anita Sen',
            'pan_number' => 'XYZDE5678G',
            'aadhaar_number' => '987654321098',
            'bank_account_number' => '9876543210',
        ]);

        SalaryRevision::create([
            'employee_id' => $this->emp1->id,
            'effective_date' => '2026-07-01',
            'old_basic_pay' => 25000.00,
            'old_hra' => 10000.00,
            'old_conveyance' => 0.00,
            'old_da' => 0.00,
            'old_medical_allowance' => 0.00,
            'old_special_allowance' => 15000.00,
            'old_other_additions' => 0.00,
            'old_net_take_home' => 45000.00,
            'old_ctc' => 50000.00,
            'new_basic_pay' => 28750.00,
            'new_hra' => 11500.00,
            'new_conveyance' => 0.00,
            'new_da' => 0.00,
            'new_medical_allowance' => 0.00,
            'new_special_allowance' => 17250.00,
            'new_other_additions' => 0.00,
            'new_net_take_home' => 51750.00,
            'new_ctc' => 57500.00,
            'old_designation' => 'Software Engineer',
            'new_designation' => 'Senior Software Engineer',
            'is_promotion' => true,
            'status' => 'approved',
        ]);

        SalaryRevision::create([
            'employee_id' => $this->emp2->id,
            'effective_date' => '2026-07-01',
            'old_basic_pay' => 20000.00,
            'old_hra' => 8000.00,
            'old_conveyance' => 0.00,
            'old_da' => 0.00,
            'old_medical_allowance' => 0.00,
            'old_special_allowance' => 12000.00,
            'old_other_additions' => 0.00,
            'old_net_take_home' => 36000.00,
            'old_ctc' => 40000.00,
            'new_basic_pay' => 22000.00,
            'new_hra' => 8800.00,
            'new_conveyance' => 0.00,
            'new_da' => 0.00,
            'new_medical_allowance' => 0.00,
            'new_special_allowance' => 13200.00,
            'new_other_additions' => 0.00,
            'new_net_take_home' => 39600.00,
            'new_ctc' => 44000.00,
            'status' => 'pending_approval',
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->manager1 = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->manager1->managedClients()->attach([$this->client1->id]);
    }

    public function test_1_increment_percentage_math()
    {
        $svc = new SalaryRevisionReportService();
        $adminRows = $svc->runForExport([], $this->admin);

        $sample = $adminRows->firstWhere('employee_code', 'TEC-001');

        $this->assertNotNull($sample);
        $this->assertEquals(50000.00, $sample['old_ctc']);
        $this->assertEquals(57500.00, $sample['new_ctc']);
        $this->assertEquals('+15%', $sample['increment_pct']);
    }

    public function test_2_salary_revision_scoping_exclusion()
    {
        $svc = new SalaryRevisionReportService();

        $adminRows = $svc->runForExport([], $this->admin);
        $mgrRows   = $svc->runForExport([], $this->manager1);

        $this->assertCount(2, $adminRows);
        $this->assertCount(1, $mgrRows);
        $this->assertEquals('TEC-001', $mgrRows->first()['employee_code']);
    }

    public function test_3_csv_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/salary_revision_history/export');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_4_pdf_export_response()
    {
        $res = $this->actingAs($this->admin)->get('/admin/reports/salary_revision_history/pdf');
        $res->assertStatus(200);
        $res->assertHeader('content-type', 'application/pdf');
    }
}
