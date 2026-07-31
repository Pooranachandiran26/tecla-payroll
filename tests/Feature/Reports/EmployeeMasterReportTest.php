<?php

namespace Tests\Feature\Reports;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\Reports\EmployeeMasterReportService;

class EmployeeMasterReportTest extends TestCase
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
            'aadhaar_number' => '222200000001',
            'gross_monthly_salary' => 50000.00,
            'ctc_monthly' => 55000.00,
        ]);

        $this->emp2 = Employee::factory()->create([
            'client_id' => $this->client2->id,
            'branch_id' => $branch2->id,
            'full_name' => 'Prem S',
            'employee_code' => 'EMP-002',
            'bank_account_number' => '8147282914',
            'pan_number' => 'PBSPS0913Q',
            'aadhaar_number' => '222200000002',
            'gross_monthly_salary' => 40000.00,
            'ctc_monthly' => 44000.00,
        ]);

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->managerA = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerA->managedClients()->attach([$this->client1->id]);

        $this->managerB = User::factory()->create(['role' => 'manager', 'status' => 'active']);
        $this->managerB->managedClients()->attach([$this->client2->id]);
    }

    /**
     * Test 1: Admin vs Manager A PII masking on EXACT SAME EMPLOYEE (emp1: Rajesh Su)
     */
    public function test_1_pii_masking_same_employee_side_by_side()
    {
        $service = new EmployeeMasterReportService();

        // Admin gets raw unmasked PII for EMP-001
        $adminRows = $service->runForExport([], $this->admin);
        $adminRow = $adminRows->firstWhere('employee_code', 'EMP-001');
        $this->assertEquals('8147282913', $adminRow['bank_account_number']);
        $this->assertEquals('PBSPS0913E', $adminRow['pan_number']);

        // Manager A gets exact masked PII for EXACT SAME EMPLOYEE EMP-001
        $managerARows = $service->runForExport([], $this->managerA);
        $managerARow = $managerARows->firstWhere('employee_code', 'EMP-001');
        $this->assertEquals('******2913', $managerARow['bank_account_number']);
        $this->assertEquals('PB******3E', $managerARow['pan_number']);

        // Verify all non-PII operational fields are 100% identical between Admin and Manager
        $this->assertEquals($adminRow['full_name'], $managerARow['full_name']);
        $this->assertEquals($adminRow['client_name'], $managerARow['client_name']);
        $this->assertEquals($adminRow['ctc_monthly'], $managerARow['ctc_monthly']);
    }

    /**
     * Test 2: Scoping — Manager A sees only Alpha Corp, Manager B sees only Beta Logistics
     */
    public function test_2_employee_master_scoping()
    {
        $service = new EmployeeMasterReportService();

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
     * Test 3: CSV Export response
     */
    public function test_3_csv_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/employee_master/export');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Emp Code', $content);
        $this->assertStringContainsString('EMP-001', $content);
    }

    /**
     * Test 4: PDF Export response and binary header
     */
    public function test_4_pdf_export_response()
    {
        $response = $this->actingAs($this->admin)->get('/admin/reports/employee_master/pdf');
        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');

        $content = $response->streamedContent();
        $this->assertStringStartsWith('%PDF-', $content);
    }
}
