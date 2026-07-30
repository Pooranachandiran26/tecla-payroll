<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\SalaryCalculationService;
use App\Services\MonthlyPayrollCalculator;
use App\Services\FullAndFinalCalculationService;
use App\Services\AttendanceResolutionService;
use Illuminate\Support\Facades\DB;

echo "=====================================================================\n";
echo "STEP 1: SEED A REAL COMPREHENSIVE TEST SCENARIO\n";
echo "=====================================================================\n";

DB::beginTransaction();

try {
    // 1. Create Comprehensive Client (Tamil Nadu, EDLI Exempt, Gratuity Enabled, Statutory Bonus Enabled, LWF Annual)
    $client = Client::create([
        'company_name' => 'Tamil Nadu EOR Statutory Integration Corp',
        'company_type' => 'pvt_ltd',
        'client_code' => 'TN-INT-001',
        'industry' => 'Technology',
        'registered_address_line_1' => '100 Anna Salai',
        'registered_city' => 'Chennai',
        'registered_state' => 'Tamil Nadu',
        'registered_pin' => '600002',
        'contract_type' => 'agency',
        'billing_model' => 'markup',
        'markup_percentage' => 10.00,
        'contract_start_date' => '2025-01-01',
        'status' => 'active',
        'pt_state' => 'Tamil Nadu',
        'edli_exempted' => true,
        'gratuity_applicable' => true,
        'default_gratuity_mode' => 'ctc_included',
        'statutory_bonus_applicable' => true,
        'bonus_rate_percentage' => 8.33,
        'lwf_applicable' => true,
        'lwf_frequency' => 'annual',
        'pf_applicable' => true,
        'esi_applicable' => true,
        'tds_applicable' => true,
        'lop_basis_days' => '30',
        'weekly_off_pattern' => 'sat,sun',
        'primary_poc_name' => 'Integration Manager',
        'primary_poc_email' => 'poc.integration@test.com',
        'primary_poc_phone' => '9876543210',
    ]);

    $branch = ClientBranch::create([
        'client_id' => $client->id,
        'branch_name' => 'Chennai HO',
        'state' => 'Tamil Nadu',
        'city' => 'Chennai',
        'address_line_1' => '100 Anna Salai',
        'pin_code' => '600002',
        'is_head_office' => true,
        'is_primary_billing_branch' => true,
    ]);

    echo "Client Created: ID {$client->id} | Code: {$client->client_code} | EDLI Exempted: " . ($client->edli_exempted ? 'YES' : 'NO') . " | PT State: {$client->pt_state}\n\n";

    // 2. Create Employee A (Basic ₹9,000, DA ₹1,000, HRA ₹3,000 -> Gross ₹13,000. Gratuity: part_of_ctc)
    $employeeA = Employee::create([
        'client_id' => $client->id,
        'branch_id' => $branch->id,
        'employee_code' => 'EMP-TN-A',
        'full_name' => 'Arun Kumar',
        'first_name' => 'Arun',
        'last_name' => 'Kumar',
        'personal_email' => 'arun.tn@integration.test',
        'phone_number' => '9876543201',
        'date_of_birth' => '1992-04-10',
        'date_of_joining' => '2021-01-01',
        'designation' => 'Junior Support Specialist',
        'employment_model' => 'agency_contract',
        'employment_type' => 'permanent',
        'prior_employment_flag' => false,
        'residential_address' => '12 Triplicane High Rd, Chennai',
        'bank_account_number' => '99887766554411',
        'bank_ifsc' => 'SBIN0001234',
        'bank_name' => 'State Bank of India',
        'bank_branch' => 'Triplicane',
        'account_holder_name' => 'Arun Kumar',
        'pan_number' => 'ARUNK1234A',
        'basic_pay' => 9000.00,
        'da' => 1000.00,
        'hra' => 3000.00,
        'conveyance' => 0.00,
        'medical_allowance' => 0.00,
        'special_allowance' => 0.00,
        'other_additions' => 0.00,
        'gross_monthly_salary' => 13000.00,
        'pf_applicable' => true,
        'esi_applicable' => true,
        'pt_applicable' => true,
        'lwf_applicable' => true,
        'tds_applicable' => false,
        'gratuity_mode' => 'part_of_ctc',
        'lop_basis_days' => '30',
        'declarations_accepted' => true,
        'status' => 'active',
    ]);

    // 3. Create Employee B (Basic ₹22,000, DA ₹2,000, HRA ₹6,000, Special ₹10,000 -> Gross ₹40,000. Gratuity: over_and_above)
    $employeeB = Employee::create([
        'client_id' => $client->id,
        'branch_id' => $branch->id,
        'employee_code' => 'EMP-TN-B',
        'full_name' => 'Bala Subramanian',
        'first_name' => 'Bala',
        'last_name' => 'Subramanian',
        'personal_email' => 'bala.tn@integration.test',
        'phone_number' => '9876543202',
        'date_of_birth' => '1988-08-20',
        'date_of_joining' => '2023-01-01',
        'designation' => 'Senior Systems Architect',
        'employment_model' => 'agency_contract',
        'employment_type' => 'permanent',
        'prior_employment_flag' => false,
        'residential_address' => '45 T Nagar Main Rd, Chennai',
        'bank_account_number' => '99887766554422',
        'bank_ifsc' => 'HDFC0004321',
        'bank_name' => 'HDFC Bank',
        'bank_branch' => 'T Nagar',
        'account_holder_name' => 'Bala Subramanian',
        'pan_number' => 'BALAS5678B',
        'basic_pay' => 22000.00,
        'da' => 2000.00,
        'hra' => 6000.00,
        'conveyance' => 0.00,
        'medical_allowance' => 0.00,
        'special_allowance' => 10000.00,
        'other_additions' => 0.00,
        'gross_monthly_salary' => 40000.00,
        'pf_applicable' => true,
        'esi_applicable' => false,
        'pt_applicable' => true,
        'lwf_applicable' => true,
        'tds_applicable' => true,
        'gratuity_mode' => 'over_and_above',
        'lop_basis_days' => '30',
        'declarations_accepted' => true,
        'status' => 'active',
    ]);

    echo "Employee A Created: Code: {$employeeA->employee_code} | Basic: ₹{$employeeA->basic_pay} | Gross: ₹{$employeeA->gross_monthly_salary} | Gratuity Mode: {$employeeA->gratuity_mode}\n";
    echo "Employee B Created: Code: {$employeeB->employee_code} | Basic: ₹{$employeeB->basic_pay} | Gross: ₹{$employeeB->gross_monthly_salary} | Gratuity Mode: {$employeeB->gratuity_mode}\n\n";

    echo "=====================================================================\n";
    echo "STEP 2: RUN REAL PAYROLL CYCLE (JULY 2026)\n";
    echo "=====================================================================\n";

    $salaryService = app(SalaryCalculationService::class);

    // Structural CTC Breakdown check
    $calcA = $salaryService->calculateStructuralSalary($employeeA->toArray());
    $calcB = $salaryService->calculateStructuralSalary($employeeB->toArray());

    echo "--- EMPLOYEE A STRUCTURAL SALARY & CTC BREAKDOWN ---\n";
    echo json_encode($calcA, JSON_PRETTY_PRINT) . "\n\n";

    echo "--- EMPLOYEE B STRUCTURAL SALARY & CTC BREAKDOWN ---\n";
    echo json_encode($calcB, JSON_PRETTY_PRINT) . "\n\n";

    // Run actual Monthly Payroll Processing
    $payrollRun = PayrollRun::create([
        'client_id' => $client->id,
        'payroll_month' => '2026-07-01',
        'status' => 'draft',
    ]);

    $payrollCalculator = app(MonthlyPayrollCalculator::class);

    // Mock full attendance for July (30 paid days out of 30)
    $resolutionServiceMock = new class extends AttendanceResolutionService {
        public function resolveForEmployee(Employee $employee, string $monthStart, string $monthEnd): array {
            return [
                'paid_days' => 30,
                'lop_days' => 0,
                'attendance_source' => 'live_punch',
            ];
        }
    };
    
    // Inject mock into MonthlyPayrollCalculator via reflection or instantiation
    $refProp = new ReflectionProperty(MonthlyPayrollCalculator::class, 'attendanceService');
    $refProp->setAccessible(true);
    $refProp->setValue($payrollCalculator, $resolutionServiceMock);

    $resA = $payrollCalculator->calculateForEmployee($employeeA, $payrollRun);
    $resB = $payrollCalculator->calculateForEmployee($employeeB, $payrollRun);

    echo "--- EMPLOYEE A MONTHLY PAYROLL RESULT (JULY 2026) ---\n";
    echo json_encode($resA, JSON_PRETTY_PRINT) . "\n\n";

    echo "--- EMPLOYEE B MONTHLY PAYROLL RESULT (JULY 2026) ---\n";
    echo json_encode($resB, JSON_PRETTY_PRINT) . "\n\n";

    echo "=====================================================================\n";
    echo "STEP 4: EXIT EMPLOYEE A & VERIFY FULL & FINAL SETTLEMENT\n";
    echo "=====================================================================\n";

    // First lock July 2026 payroll run so past PT payments are recorded
    $payrollRun->update(['status' => 'locked']);

    $fnfService = app(FullAndFinalCalculationService::class);
    $fnfInputs = [
        'last_working_day' => '2026-07-15',
        'notice_shortfall_days' => 0,
        'notice_amount_type' => 'none',
        'unused_leaves' => 0,
        'pending_salary_amount' => 6500.00, // half month gross
        'loan_recovery_amount' => 0.00,
        'tds_amount' => 0.00,
    ];

    $fnfResult = $fnfService->calculatePreview($employeeA, $fnfInputs);

    echo "--- EMPLOYEE A FULL & FINAL SETTLEMENT PREVIEW ---\n";
    echo json_encode($fnfResult, JSON_PRETTY_PRINT) . "\n\n";

    DB::rollBack();
    echo "Transaction rolled back cleanly.\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
}
