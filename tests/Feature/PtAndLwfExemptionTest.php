<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\MonthlyPayrollCalculator;
use Database\Seeders\PtSlabSeeder;
use Database\Seeders\LwfSlabSeeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PtAndLwfExemptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PtSlabSeeder::class);
    }

    private function seedFullAttendance(Employee $employee, string $month = '2026-07')
    {
        $start = Carbon::parse($month . '-01');
        $daysInMonth = $start->daysInMonth;

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = $start->copy()->day($d)->toDateString();
            DB::table('attendance_records')->insert([
                'employee_id' => $employee->id,
                'attendance_date' => $dateStr,
                'status' => 'present',
                'source' => 'live_punch',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /** @test */
    public function test_employee_with_pt_applicable_false_gets_zero_pt_deduction()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 15000,
            'hra' => 10000,
            'special_allowance' => 20000, // Gross = 45,000
            'gross_monthly_salary' => 45000,
            'pt_applicable' => false, // Explicitly exempt
            'pan_number' => 'ABCDE1234F',
            'aadhaar_number' => '991234567890',
            'bank_account_number' => '9912345678',
        ]);

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(45000.00, $result['gross_total']);
        $this->assertEquals(0.00, $result['professional_tax']);
    }

    /** @test */
    public function test_employee_with_pt_applicable_true_gets_top_tier_pt_slab_with_null_max_salary()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 15000,
            'hra' => 10000,
            'special_allowance' => 20000, // Gross = 45,000
            'gross_monthly_salary' => 45000,
            'pt_applicable' => true,
            'pan_number' => 'ABCDE1234G',
            'aadhaar_number' => '991234567891',
            'bank_account_number' => '9912345679',
        ]);

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(45000.00, $result['gross_total']);
        $this->assertEquals(208.33, $result['professional_tax']);
    }

    /** @test */
    public function test_employee_with_lwf_applicable_false_gets_zero_lwf_deduction()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'lwf_applicable' => true]);
        $branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Tamil Nadu']);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'date_of_joining' => '2020-01-01',
            'basic_pay' => 15000,
            'hra' => 10000,
            'gross_monthly_salary' => 25000,
            'lwf_applicable' => false, // Explicitly exempt
            'pan_number' => 'ABCDE1234H',
            'aadhaar_number' => '991234567892',
            'bank_account_number' => '9912345680',
        ]);

        $this->seedFullAttendance($employee, '2026-07');

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $payrollRun);

        $this->assertEquals(0.00, $result['lwf_deduction']);
        $this->assertEquals(0.00, $result['employer_lwf']);
    }

    /** @test */
    public function test_client_statutory_defaults_returns_pt_applicable_true_when_pt_state_configured()
    {
        $client = Client::factory()->create(['registered_state' => 'Tamil Nadu', 'pt_state' => 'Tamil Nadu']);
        $user = \App\Models\User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($user)->getJson(route('clients.statutoryDefaults', $client->id));

        $response->assertStatus(200);
        $response->assertJson([
            'ptApplicable' => true,
            'ptState' => 'Tamil Nadu',
        ]);
    }
}
