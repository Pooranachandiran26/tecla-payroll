<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\MonthlyPayrollCalculator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FullAttendanceSalaryCapTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected MonthlyPayrollCalculator $payrollCalculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->payrollCalculator = app(MonthlyPayrollCalculator::class);
    }

    private function createClientWithBranch(array $attributes = []): Client
    {
        $client = Client::factory()->create($attributes);
        ClientBranch::factory()->create(['client_id' => $client->id]);
        return $client;
    }

    private function seedFullAttendance(Employee $employee, string $month = '2026-08'): void
    {
        $start = Carbon::parse($month . '-01');
        $end = $start->copy()->endOfMonth();

        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if (strtolower($d->format('D')) !== 'sun') {
                AttendanceRecord::create([
                    'employee_id' => $employee->id,
                    'attendance_date' => $d->toDateString(),
                    'status' => 'present',
                    'source' => 'uploaded',
                ]);
            }
        }
    }

    #[Test]
    public function test_1_full_attendance_in_august_31_days_with_26_day_basis_earns_exact_100_percent_salary()
    {
        // Setup client with lop_basis_days = 26 and sun pattern
        $client = $this->createClientWithBranch([
            'company_name' => 'LOP_TESTING_CAP',
            'weekly_off_pattern' => 'sun',
            'lop_basis_days' => '26',
        ]);

        // Setup employee with ₹49,000 fixed monthly structure
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'TEC-467-TEST',
            'full_name' => 'Madhu Test',
            'date_of_joining' => '2026-01-01',
            'basic_pay' => 30000,
            'hra' => 10000,
            'conveyance' => 3000,
            'medical_allowance' => 5000,
            'special_allowance' => 1000,
            'da' => 0,
            'other_additions' => 0,
            'lop_basis_days' => '26',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
            'processed_by' => $this->admin->id,
        ]);

        // Seed full attendance for August 2026 (0 LOP)
        $this->seedFullAttendance($employee, '2026-08');

        // Calculate payroll for August (31 calendar days, 0 LOP)
        $result = $this->payrollCalculator->calculateForEmployee($employee, $payrollRun);

        // Assert gross total equals 100% of configured salary structure (49000.00), NOT 58423.08!
        $this->assertEquals(49000.00, $result['gross_total']);
        $this->assertEquals(30000.00, $result['basic_pay']);
        $this->assertEquals(10000.00, $result['hra']);
        $this->assertEquals(3000.00, $result['conveyance']);
        $this->assertEquals(5000.00, $result['medical_allowance']);
        $this->assertEquals(1000.00, $result['special_allowance']);
        $this->assertEquals(0.00, $result['lop_deduction']);
    }

    #[Test]
    public function test_2_lop_days_deducts_using_lop_basis_days_rate()
    {
        $client = $this->createClientWithBranch([
            'weekly_off_pattern' => 'sun',
            'lop_basis_days' => '26',
        ]);

        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'employee_code' => 'TEC-467-LOP',
            'date_of_joining' => '2026-01-01',
            'basic_pay' => 30000,
            'hra' => 10000,
            'conveyance' => 3000,
            'medical_allowance' => 5000,
            'special_allowance' => 1000,
            'da' => 0,
            'other_additions' => 0,
            'lop_basis_days' => '26',
        ]);

        $payrollRun = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-08-01',
            'status' => 'draft',
            'processed_by' => $this->admin->id,
        ]);

        // Seed full attendance first, then set 2 days as absent (LOP)
        $this->seedFullAttendance($employee, '2026-08');

        AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', '2026-08-03')
            ->update(['status' => 'absent']);

        AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', '2026-08-04')
            ->update(['status' => 'absent']);

        $result = $this->payrollCalculator->calculateForEmployee($employee, $payrollRun);

        // Expected LOP deduction: 2 * (49000 / 26) = 3769.23
        // Expected Earned Gross: 49000 - 3769.23 = 45230.77
        $this->assertEquals(3769.23, $result['lop_deduction']);
        $this->assertEquals(45230.77, $result['gross_total']);
    }
}
