<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\AttendanceResolutionService;
use App\Services\MonthlyPayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LopBasisDaysFlexibilityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function createClientWithBranch(array $attributes = []): Client
    {
        $client = Client::factory()->create($attributes);
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    private function getValidEmployeePayload(Client $client, array $overrides = []): array
    {
        return array_merge([
            'clientPartner' => $client->id,
            'fullName' => 'Strict 30 Employee',
            'personalEmail' => 'strict30@example.com',
            'phone' => '9876543210',
            'dob' => '1995-05-15',
            'doj' => '2026-01-01',
            'gender' => 'male',
            'designation' => 'Software Engineer',
            'empType' => 'agency_contract',
            'address' => '123 Main Street',
            'accountNo' => '123456789012',
            'ifsc' => 'HDFC0000001',
            'bankName' => 'HDFC Bank',
            'bankBranch' => 'Main Branch',
            'accountHolder' => 'Strict 30 Employee',
            'pan' => 'ABCDE1234F',
            'uanMode' => 'new',
            'esiMode' => 'new',
            'tdsRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '30',
            'basicSal' => 30000,
            'hraSal' => 5000,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ], $overrides);
    }

    #[Test]
    public function test_1_client_creation_and_employee_store_forces_lop_basis_strictly_30()
    {
        $this->actingAs($this->admin);

        $clientData = [
            'name' => 'Strict 30 Divisor Corp',
            'code' => 'DIV30',
            'type' => 'pvt_ltd',
            'industry' => 'IT Services',
            'contractType' => 'agency',
            'billingModel' => 'markup',
            'markupPct' => 10,
            'contractStart' => '2026-01-01',
            'locationsCount' => 1,
            'regAddressLine1' => '123 Main St',
            'regCity' => 'Mumbai',
            'regState' => 'Maharashtra',
            'regPin' => '400001',
            'lopBasis' => 30,
            'poc1' => [
                'name' => 'John POC',
                'email' => 'poc30@div.com',
                'phone' => '9876543210',
            ]
        ];

        $clientResponse = $this->post(route('clients.store'), $clientData);
        $clientResponse->assertRedirect();

        $client = Client::where('client_code', 'DIV30')->firstOrFail();
        $this->assertEquals('30', (string) $client->lop_basis_days);

        ClientBranch::factory()->create(['client_id' => $client->id]);

        $payload = $this->getValidEmployeePayload($client, ['lopBasis' => '30']);
        $empResponse = $this->post(route('employees.store'), $payload);
        $empResponse->assertRedirect();

        $employee = Employee::where('personal_email', 'strict30@example.com')->firstOrFail();
        $this->assertEquals('30', (string) $employee->lop_basis_days);
    }

    #[Test]
    public function test_2_payroll_calculation_uses_strictly_30_divisor_basis()
    {
        DB::table('salary_revisions')->delete();

        $client = $this->createClientWithBranch(['lop_basis_days' => '30']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
            'lop_basis_days' => '30',
            'basic_pay' => 30000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_monthly_salary' => null,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        // 30000 basic, 28 paid days, 2 LOP days
        $paidDays = 28;
        $lopDays = 2;

        $expectedBasicProrated = round(30000 * (28 / 30), 2); // 28000.00
        $expectedLopDeduction = round(30000 * (2 / 30), 2); // 2000.00

        $this->mock(AttendanceResolutionService::class, function ($mock) use ($paidDays, $lopDays) {
            $mock->shouldReceive('resolveForEmployee')->andReturn([
                'paid_days' => $paidDays,
                'lop_days' => $lopDays,
                'attendance_source' => 'live_punch',
            ]);
        });

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals($expectedBasicProrated, $result['basic_pay']);
        $this->assertEquals($expectedBasicProrated, $result['gross_total']);
        $this->assertEquals($expectedLopDeduction, $result['lop_deduction']);
    }

    #[Test]
    public function test_3_lop_divisor_is_strictly_30_for_all_payroll_calculations()
    {
        DB::table('salary_revisions')->delete();

        $client30 = $this->createClientWithBranch(['lop_basis_days' => '30']);
        $emp30 = Employee::factory()->create([
            'client_id' => $client30->id,
            'pan_number' => 'CCCCC3333C',
            'aadhaar_number' => '333333333333',
            'bank_account_number' => '333333333333',
            'lop_basis_days' => '30',
            'basic_pay' => 30000,
            'hra' => 0,
            'conveyance' => 0,
            'da' => 0,
            'medical_allowance' => 0,
            'special_allowance' => 0,
            'other_additions' => 0,
            'gross_monthly_salary' => null,
            'pf_applicable' => false,
            'esi_applicable' => false,
            'pt_applicable' => false,
        ]);

        $run30 = PayrollRun::create([
            'client_id' => $client30->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $this->mock(AttendanceResolutionService::class, function ($mock) {
            $mock->shouldReceive('resolveForEmployee')->andReturn([
                'paid_days' => 28,
                'lop_days' => 2,
                'attendance_source' => 'live_punch',
            ]);
        });

        $calculator = app(MonthlyPayrollCalculator::class);
        $result30 = $calculator->calculateForEmployee($emp30, $run30);
        $expected30 = round(30000 * (28 / 30), 2); // 28000.00
        $this->assertEquals(28000.00, $expected30);
        $this->assertEquals(28000.00, $result30['basic_pay']);
    }
}
