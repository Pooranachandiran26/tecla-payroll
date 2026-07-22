<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use App\Models\Employee;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class ClientPayslipBrandingTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function createRunItem($runId, $employeeId, array $overrides = [])
    {
        return PayrollRunItem::create(array_merge([
            'payroll_run_id' => $runId,
            'employee_id' => $employeeId,
            'paid_days' => 30.0,
            'lop_days' => 0.0,
            'basic_pay' => 30000.0,
            'hra' => 12000.0,
            'conveyance' => 1600.0,
            'da' => 0.0,
            'medical_allowance' => 1250.0,
            'special_allowance' => 5150.0,
            'other_additions' => 0.0,
            'gross_total' => 50000.0,
            'employee_pf' => 1800.0,
            'employee_esi' => 375.0,
            'professional_tax' => 200.0,
            'lwf_deduction' => 25.0,
            'lop_deduction' => 0.0,
            'tds_deduction' => 0.0,
            'loan_emi_deduction' => 0.0,
            'net_pay' => 47600.0,
            'employer_pf' => 1800.0,
            'employer_esi' => 1625.0,
            'is_excluded' => false,
            'attendance_source' => 'uploaded',
        ], $overrides));
    }

    public function test_eor_employee_payslip_shows_client_branding()
    {
        // 1. Create EOR Client with custom branding via factory
        $client = Client::factory()->create([
            'company_name' => 'Mahindra EOR Co',
            'display_name_override' => 'Mahindra EOR Override',
            'contract_type' => 'eor',
            'logo_path' => 'data:image/png;base64,fakebase64logo',
            'accent_color' => '#FF5733',
            'registered_city' => 'Mumbai',
            'registered_state' => 'Maharashtra',
            'gstin' => '27AABCM1234N1ZQ',
        ]);

        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // 2. Create EOR Employee
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-EOR-01',
            'personal_email' => 'eor.ramesh@example.com',
            'phone_number' => '9111111111',
            'pan_number' => 'ABCDE1111F',
            'aadhaar_number' => '123456781111',
            'bank_account_number' => '123456789111',
            'employment_model' => 'eor',
        ]);

        // 3. Create draft payroll run
        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        // 4. Create run item via helper
        $this->createRunItem($run->id, $employee->id, [
            'gross_total' => 88250,
            'net_pay' => 80000,
        ]);

        // 5. Lock the run
        $run->status = 'locked';
        $run->save();

        // 6. Query payslip endpoint
        $response = $this->actingAs($this->admin)
            ->get('/payroll/payslips?client_id=' . $client->id . '&payroll_month=2026-07-01');

        $response->assertStatus(200);

        // 7. Assert Inertia props contain expected values
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('clientBranding', fn (Assert $branding) => $branding
                ->where('company_name', 'Mahindra EOR Co')
                ->where('display_name_override', 'Mahindra EOR Override')
                ->where('logo_path', 'data:image/png;base64,fakebase64logo')
                ->where('accent_color', '#FF5733')
                ->where('registered_city', 'Mumbai')
                ->where('registered_state', 'Maharashtra')
                ->where('gstin', '27AABCM1234N1ZQ')
                ->etc()
            )
            ->has('items.data', 1, fn (Assert $item) => $item
                ->where('employee_code', 'EMP-EOR-01')
                ->where('employment_model', 'eor')
                ->etc()
            )
        );
    }

    public function test_agency_employee_payslip_shows_tecla_branding_defaults()
    {
        // 1. Create Agency Client with no branding override
        $client = Client::factory()->create([
            'company_name' => 'Wipro Agency Co',
            'contract_type' => 'agency',
            'logo_path' => null,
            'accent_color' => null,
            'display_name_override' => null,
        ]);

        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // 2. Create Agency Employee
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-AGC-01',
            'personal_email' => 'agc.suresh@example.com',
            'phone_number' => '9222222222',
            'pan_number' => 'ABCDE2222F',
            'aadhaar_number' => '123456782222',
            'bank_account_number' => '123456789222',
            'employment_model' => 'agency_contract',
        ]);

        // 3. Create draft payroll run
        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        // 4. Create run item
        $this->createRunItem($run->id, $employee->id, [
            'gross_total' => 60000,
            'net_pay' => 55000,
        ]);

        // 5. Lock the run
        $run->status = 'locked';
        $run->save();

        // 6. Query payslip endpoint
        $response = $this->actingAs($this->admin)
            ->get('/payroll/payslips?client_id=' . $client->id . '&payroll_month=2026-07-01');

        $response->assertStatus(200);

        // 7. Assert Inertia props contain expected values
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('clientBranding', fn (Assert $branding) => $branding
                ->where('company_name', 'Wipro Agency Co')
                ->where('display_name_override', null)
                ->where('logo_path', null)
                ->where('accent_color', null)
                ->etc()
            )
            ->has('items.data', 1, fn (Assert $item) => $item
                ->where('employee_code', 'EMP-AGC-01')
                ->where('employment_model', 'agency_contract')
                ->etc()
            )
        );
    }

    public function test_hybrid_client_shows_different_branding_per_employee()
    {
        // 1. Create Hybrid Client with custom EOR branding
        $client = Client::factory()->create([
            'company_name' => 'Tata Hybrid Co',
            'display_name_override' => 'Tata Hybrid Override',
            'contract_type' => 'hybrid',
            'logo_path' => 'data:image/png;base64,tatalogo',
            'accent_color' => '#0055FF',
            'registered_city' => 'Pune',
            'registered_state' => 'Maharashtra',
            'gstin' => '27AACTT5566K1ZC',
        ]);

        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // 2. Create one EOR Employee and one Agency Employee under same client
        $eorEmployee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-HYB-EOR',
            'personal_email' => 'hyb.eor@example.com',
            'phone_number' => '9333333333',
            'pan_number' => 'ABCDE3333F',
            'aadhaar_number' => '123456783333',
            'bank_account_number' => '123456789333',
            'employment_model' => 'eor',
        ]);

        $agencyEmployee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-HYB-AGC',
            'personal_email' => 'hyb.agc@example.com',
            'phone_number' => '9444444444',
            'pan_number' => 'ABCDE4444F',
            'aadhaar_number' => '123456784444',
            'bank_account_number' => '123456789444',
            'employment_model' => 'agency_contract',
        ]);

        // 3. Create draft payroll run
        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        // 4. Create run items
        $this->createRunItem($run->id, $eorEmployee->id, [
            'gross_total' => 120000,
            'net_pay' => 110000,
        ]);

        $this->createRunItem($run->id, $agencyEmployee->id, [
            'gross_total' => 90000,
            'net_pay' => 85000,
        ]);

        // 5. Lock the run
        $run->status = 'locked';
        $run->save();

        // 6. Query payslip endpoint
        $response = $this->actingAs($this->admin)
            ->get('/payroll/payslips?client_id=' . $client->id . '&payroll_month=2026-07-01');

        $response->assertStatus(200);

        // 7. Assert Inertia items contain both EOR and Agency models
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('clientBranding')
            ->has('items.data', 2)
        );

        // Access the items collection and verify their different models exist
        $items = $response->original->getData()['page']['props']['items'];
        $itemList = is_array($items) && isset($items['data']) ? $items['data'] : $items;
        $eorItem = collect($itemList)->firstWhere('employee_code', 'EMP-HYB-EOR');
        $agencyItem = collect($itemList)->firstWhere('employee_code', 'EMP-HYB-AGC');

        $this->assertNotNull($eorItem);
        $this->assertNotNull($agencyItem);
        $this->assertEquals('eor', $eorItem['employment_model']);
        $this->assertEquals('agency_contract', $agencyItem['employment_model']);
    }

    public function test_eor_employee_without_logo_falls_back_gracefully()
    {
        // 1. Create EOR Client with branding fields BUT logo_path is null
        $client = Client::factory()->create([
            'company_name' => 'No Logo Co',
            'display_name_override' => 'No Logo Override',
            'contract_type' => 'eor',
            'logo_path' => null,
            'accent_color' => '#118833',
        ]);

        $branch = ClientBranch::factory()->create(['client_id' => $client->id]);

        // 2. Create EOR Employee
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'employee_code' => 'EMP-NLG-01',
            'personal_email' => 'nlg.karan@example.com',
            'phone_number' => '9555555555',
            'pan_number' => 'ABCDE5555F',
            'aadhaar_number' => '123456785555',
            'bank_account_number' => '123456789555',
            'employment_model' => 'eor',
        ]);

        // 3. Create draft payroll run
        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        // 4. Create run item
        $this->createRunItem($run->id, $employee->id, [
            'gross_total' => 70000,
            'net_pay' => 65000,
        ]);

        // 5. Lock the run
        $run->status = 'locked';
        $run->save();

        // 6. Query payslip endpoint
        $response = $this->actingAs($this->admin)
            ->get('/payroll/payslips?client_id=' . $client->id . '&payroll_month=2026-07-01');

        $response->assertStatus(200);

        // 7. Assert Inertia props branding has logo_path = null
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Payroll/Payslip')
            ->has('clientBranding', fn (Assert $branding) => $branding
                ->where('logo_path', null)
                ->etc()
            )
        );
    }
}
