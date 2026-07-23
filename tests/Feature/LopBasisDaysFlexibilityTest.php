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
            'fullName' => 'Flex Employee',
            'personalEmail' => 'flex@example.com',
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
            'accountHolder' => 'Flex Employee',
            'pan' => 'ABCDE1234F',
            'uanMode' => 'new',
            'esiMode' => 'new',
            'tdsRegime' => 'new',
            'gratuityMode' => 'part_of_ctc',
            'lopBasis' => '27',
            'basicSal' => 27000,
            'hraSal' => 5000,
            'conveyanceSal' => 0,
            'daSal' => 0,
            'medicalSal' => 0,
            'specialSal' => 0,
            'otherSal' => 0,
        ], $overrides);
    }

    #[Test]
    public function test_1_client_sets_lop_basis_27_and_employee_inherits_27_without_coercion()
    {
        $this->actingAs($this->admin);

        // 1. Create client with lop_basis_days = 27 via clients.store API endpoint
        $clientData = [
            'name' => 'Custom 27 Divisor Corp',
            'code' => 'DIV27',
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
            'lopBasis' => 27,
            'poc1' => [
                'name' => 'John POC',
                'email' => 'poc27@div.com',
                'phone' => '9876543210',
            ]
        ];

        $clientResponse = $this->post(route('clients.store'), $clientData);
        $clientResponse->assertRedirect();

        $client = Client::where('client_code', 'DIV27')->firstOrFail();
        $this->assertEquals('27', (string) $client->lop_basis_days);

        // Ensure primary branch exists for employee store lookup
        ClientBranch::factory()->create(['client_id' => $client->id]);

        // 2. Create employee inheriting client's lop_basis_days = 27
        $payload = $this->getValidEmployeePayload($client, ['lopBasis' => '27']);
        $empResponse = $this->post(route('employees.store'), $payload);
        $empResponse->assertRedirect();

        $employee = Employee::where('personal_email', 'flex@example.com')->firstOrFail();
        
        // Assert stored in DB as 27, NOT coerced to 26 or 30
        $this->assertEquals('27', (string) $employee->lop_basis_days);
    }

    #[Test]
    public function test_2_dual_check_payroll_calculation_with_custom_27_divisor_basis()
    {
        DB::table('salary_revisions')->delete();

        $client = $this->createClientWithBranch(['lop_basis_days' => '27']);
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'pan_number' => 'AAAAA1111A',
            'aadhaar_number' => '111111111111',
            'bank_account_number' => '111111111111',
            'lop_basis_days' => '27',
            'basic_pay' => 27000,
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

        // Mock attendance: 25 paid days out of 27 divisor (2 LOP days)
        // 1. Independent raw formula calculation in test
        $basicSalary = 27000.00;
        $lopBasisDays = 27;
        $paidDays = 25;
        $lopDays = 2;

        $expectedBasicProrated = round($basicSalary * ($paidDays / $lopBasisDays), 2); // 25000.00
        $expectedLopDeduction = round($basicSalary * ($lopDays / $lopBasisDays), 2); // 2000.00

        $this->assertEquals(25000.00, $expectedBasicProrated);
        $this->assertEquals(2000.00, $expectedLopDeduction);

        // 2. Execute actual MonthlyPayrollCalculator
        $this->mock(AttendanceResolutionService::class, function ($mock) use ($paidDays, $lopDays) {
            $mock->shouldReceive('resolveForEmployee')->andReturn([
                'paid_days' => $paidDays,
                'lop_days' => $lopDays,
                'attendance_source' => 'live_punch',
            ]);
        });

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        // 3. Dual-check: MonthlyPayrollCalculator output matches independent raw math
        $this->assertEquals($expectedBasicProrated, $result['basic_pay']);
        $this->assertEquals($expectedBasicProrated, $result['gross_total']);
        $this->assertEquals($expectedLopDeduction, $result['lop_deduction']);
    }

    #[Test]
    public function test_3_regression_existing_26_and_30_clients_produce_identical_payroll_numbers()
    {
        DB::table('salary_revisions')->delete();

        // 1. 26-day basis test: 26000 basic, 2 LOP days (24 paid days)
        $client26 = $this->createClientWithBranch(['lop_basis_days' => '26']);
        $emp26 = Employee::factory()->create([
            'client_id' => $client26->id,
            'pan_number' => 'BBBBB2222B',
            'aadhaar_number' => '222222222222',
            'bank_account_number' => '222222222222',
            'lop_basis_days' => '26',
            'basic_pay' => 26000,
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

        $run26 = PayrollRun::create([
            'client_id' => $client26->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $this->mock(AttendanceResolutionService::class, function ($mock) {
            $mock->shouldReceive('resolveForEmployee')->andReturn([
                'paid_days' => 24,
                'lop_days' => 2,
                'attendance_source' => 'live_punch',
            ]);
        });

        $calculator = app(MonthlyPayrollCalculator::class);
        $result26 = $calculator->calculateForEmployee($emp26, $run26);
        $expected26 = round(26000 * (24 / 26), 2); // 24000.00
        $this->assertEquals(24000.00, $expected26);
        $this->assertEquals(24000.00, $result26['basic_pay']);

        // 2. 30-day basis test: 30000 basic, 2 LOP days (28 paid days)
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

        $calculator2 = app(MonthlyPayrollCalculator::class);
        $result30 = $calculator2->calculateForEmployee($emp30, $run30);
        $expected30 = round(30000 * (28 / 30), 2); // 28000.00
        $this->assertEquals(28000.00, $expected30);
        $this->assertEquals(28000.00, $result30['basic_pay']);
    }

    #[Test]
    public function test_4_validation_rejects_invalid_inputs_outside_15_to_31_bounds()
    {
        $this->actingAs($this->admin);
        $client = $this->createClientWithBranch();

        $invalidValues = [0, 3, 14, 32, -5, 'invalid_string'];

        foreach ($invalidValues as $invalid) {
            $payload = $this->getValidEmployeePayload($client, [
                'personalEmail' => "invalid_{$invalid}_" . rand(100, 999) . "@test.com",
                'lopBasis' => $invalid,
            ]);

            $response = $this->post(route('employees.store'), $payload);
            $response->assertSessionHasErrors('lop_basis_days');
        }

        // Test valid bounds (15, 22, 26, 27, 30, 31) are accepted
        $validValues = [15, 22, 26, 27, 30, 31];

        foreach ($validValues as $idx => $valid) {
            $payload = $this->getValidEmployeePayload($client, [
                'personalEmail' => "valid_{$valid}_{$idx}@test.com",
                'lopBasis' => $valid,
            ]);

            $response = $this->post(route('employees.store'), $payload);
            $response->assertRedirect();
        }
    }
}
