<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\SalaryRevision;
use App\Models\PayrollRun;
use App\Services\MonthlyPayrollCalculator;
use App\Services\AttendanceResolutionService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollRevisionProrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_proration_with_mid_month_revision_and_attendance_resolution()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $client = Client::factory()->create([
            'company_name' => 'Mahindra Corp',
            'lop_basis_days' => 26,
        ]);

        $branch = ClientBranch::create([
            'client_id' => $client->id,
            'branch_name' => 'HQ',
            'gstin' => '27AABCT1234L1ZQ'
        ]);

        // DOJ = 2026-07-16
        $employee = Employee::factory()->create([
            'client_id' => $client->id,
            'branch_id' => $branch->id,
            'status' => 'active',
            'date_of_joining' => '2026-07-16',
            'lop_basis_days' => 26,
            'pf_applicable' => true,
            'esi_applicable' => false,
            'pt_applicable' => false,
            'lwf_applicable' => false,
            'tds_applicable' => false,
            'gratuity_mode' => 'none',
            'basic_pay' => 25000,
            'hra' => 2000,
            'conveyance' => 2000,
            'da' => 2000,
            'medical_allowance' => 2000,
            'special_allowance' => 2000,
            'other_additions' => 1000,
        ]);

        // Revision Effective = 2026-07-16
        $revision = SalaryRevision::create([
            'employee_id' => $employee->id,
            'status' => 'approved',
            'effective_date' => '2026-07-16 00:00:00',
            'old_basic_pay' => 0, 'new_basic_pay' => 25000,
            'old_hra' => 0, 'new_hra' => 2000,
            'old_conveyance' => 0, 'new_conveyance' => 2000,
            'old_da' => 0, 'new_da' => 2000,
            'old_medical_allowance' => 0, 'new_medical_allowance' => 2000,
            'old_special_allowance' => 0, 'new_special_allowance' => 2000,
            'old_other_additions' => 0, 'new_other_additions' => 1000,
            'old_net_take_home' => 0, 'new_net_take_home' => 34200,
            'old_ctc' => 0, 'new_ctc' => 37950,
            'approved_at' => now(),
        ]);

        // Mock AttendanceResolutionService to return Prem g's exact results:
        // July 1 to 15 (pre-revision) -> 0 paid, 0 LOP
        // July 16 to 31 (post-revision) -> 4 paid, 12 LOP
        $this->mock(AttendanceResolutionService::class, function ($mock) use ($employee) {
            $mock->shouldReceive('resolveForEmployee')
                ->with($employee, '2026-07-01', '2026-07-15')
                ->andReturn([
                    'paid_days' => 0.0,
                    'lop_days' => 0.0,
                    'attendance_source' => 'live_punch',
                ]);
            $mock->shouldReceive('resolveForEmployee')
                ->with($employee, '2026-07-16', '2026-07-31')
                ->andReturn([
                    'paid_days' => 4.0,
                    'lop_days' => 12.0,
                    'attendance_source' => 'live_punch',
                ]);
        });

        $run = PayrollRun::create([
            'client_id' => $client->id,
            'payroll_month' => '2026-07-01',
            'status' => 'draft',
            'total_employees_processed' => 0,
            'total_employees_excluded' => 0,
            'total_gross_earnings' => 0,
            'total_net_disbursement' => 0,
            'total_employer_statutory_cost' => 0,
            'processed_by' => $admin->id,
        ]);

        $calculator = app(MonthlyPayrollCalculator::class);
        $result = $calculator->calculateForEmployee($employee, $run);

        // Reconcile and assert:
        // Expected gross = 36000 * 4 / 26 = 5538.46 (approx, due to components rounding)
        // basic = round(25000 * 4 / 26, 2) = 3846.15
        // hra/conv/da/med/special = round(2000 * 4 / 26, 2) = 307.69
        // other = round(1000 * 4 / 26, 2) = 153.85
        // grossTotal = 3846.15 + 307.69 * 5 + 153.85 = 5538.45
        $this->assertEquals(3846.15, round($result['basic_pay'], 2));
        $this->assertEquals(307.69, round($result['hra'], 2));
        $this->assertEquals(5538.45, round($result['gross_total'], 2));

        // Expected LOP = structuralGross (36000 * 16 / 26 = 22153.85) - grossTotal (5538.45) = 16615.40
        // Wait, structural components sum:
        // basic = 25000 * 16/26 = 15384.62
        // hra/conv/da/med/special = 2000 * 16/26 = 1230.77
        // other = 1000 * 16/26 = 615.38
        // structuralGross = 15384.62 + 1230.77 * 5 + 615.38 = 22153.85
        // lopDeduction = 22153.85 - 5538.45 = 16615.40
        $this->assertEquals(16615.40, round($result['lop_deduction'], 2));

        // Assert net_pay = grossTotal - deductions
        // PF = round(min(basic, 15000) * 0.12, 2) = round(3846.15 * 0.12, 2) = 461.54
        // netPay = grossTotal (5538.45) - PF (461.54) = 5076.91
        $this->assertEquals(5076.91, round($result['net_pay'], 2));
    }
}
