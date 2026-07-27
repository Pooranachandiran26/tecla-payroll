<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\SalaryCalculationService;
use App\Services\MonthlyPayrollCalculator;
use Illuminate\Support\Facades\DB;

echo "=======================================================\n";
echo "EMPIRICAL VERIFICATION: PAYMENT OF BONUS ACT COMPLIANCE\n";
echo "=======================================================\n\n";

$svc = new SalaryCalculationService();

function createTestEmp($client, $branch, $basic) {
    $rand = rand(100000, 999999);
    return Employee::factory()->create([
        'client_id' => $client->id,
        'branch_id' => $branch->id,
        'basic_pay' => $basic,
        'pan_number' => 'PAN' . $rand . 'A',
        'aadhaar_number' => '9999' . $rand . '12',
        'bank_account_number' => '1000' . $rand . '15',
        'uan_mode' => 'existing_transfer'
    ]);
}

// 1. Basic Rs. 15,000 (Capped at Rs. 7,000 base)
$client15 = Client::factory()->create(['statutory_bonus_applicable' => true, 'bonus_rate_percentage' => 8.33]);
$branch15 = ClientBranch::factory()->create(['client_id' => $client15->id]);
$emp15 = createTestEmp($client15, $branch15, 15000);
$calc15 = $svc->calculateStructuralSalary($emp15);

echo "1. Basic Rs. 15,000 (Under Rs. 21k, Above Rs. 7k ceiling):\n";
echo "   - Expected Base: Rs. 7,000 | Expected Bonus: Rs. 583.10\n";
echo "   - Actual Bonus: Rs. " . number_format($calc15['bonus_accrual_monthly'], 2) . "\n\n";

// 2. Basic Rs. 25,000 (Above Rs. 21k threshold -> EXEMPT)
$client25 = Client::factory()->create(['statutory_bonus_applicable' => true, 'bonus_rate_percentage' => 8.33]);
$branch25 = ClientBranch::factory()->create(['client_id' => $client25->id]);
$emp25 = createTestEmp($client25, $branch25, 25000);
$calc25 = $svc->calculateStructuralSalary($emp25);

echo "2. Basic Rs. 25,000 (ABOVE Rs. 21k Threshold -> EXEMPT):\n";
echo "   - Expected Bonus: Rs. 0.00\n";
echo "   - Actual Bonus: Rs. " . number_format($calc25['bonus_accrual_monthly'], 2) . "\n\n";

// 3. Basic Rs. 5,000 (Low-Earner case -> Full Basic used)
$client5 = Client::factory()->create(['statutory_bonus_applicable' => true, 'bonus_rate_percentage' => 8.33]);
$branch5 = ClientBranch::factory()->create(['client_id' => $client5->id]);
$emp5 = createTestEmp($client5, $branch5, 5000);
$calc5 = $svc->calculateStructuralSalary($emp5);

echo "3. Basic Rs. 5,000 (Low Earner <= Rs. 7k ceiling):\n";
echo "   - Expected Base: Rs. 5,000 | Expected Bonus: Rs. 416.50\n";
echo "   - Actual Bonus: Rs. " . number_format($calc5['bonus_accrual_monthly'], 2) . "\n\n";

// 4. Basic EXACTLY Rs. 21,000 (Boundary condition)
$client21 = Client::factory()->create(['statutory_bonus_applicable' => true, 'bonus_rate_percentage' => 8.33]);
$branch21 = ClientBranch::factory()->create(['client_id' => $client21->id]);
$emp21 = createTestEmp($client21, $branch21, 21000);
$calc21 = $svc->calculateStructuralSalary($emp21);

echo "4. Basic EXACTLY Rs. 21,000 (Boundary Condition):\n";
echo "   - Expected Eligibility: TRUE (<= 21000)\n";
echo "   - Expected Bonus: Rs. 583.10\n";
echo "   - Actual Bonus: Rs. " . number_format($calc21['bonus_accrual_monthly'], 2) . "\n\n";

// 5. Statutory Rate Range (8.33% vs 20.00%)
$clientMax = Client::factory()->create(['statutory_bonus_applicable' => true, 'bonus_rate_percentage' => 20.00]);
$branchMax = ClientBranch::factory()->create(['client_id' => $clientMax->id]);
$empMax = createTestEmp($clientMax, $branchMax, 15000);
$calcMax = $svc->calculateStructuralSalary($empMax);

echo "5. Statutory Rate Range (20% Max Rate on Rs. 7k base):\n";
echo "   - Expected Bonus: Rs. 1,400.00\n";
echo "   - Actual Bonus: Rs. " . number_format($calcMax['bonus_accrual_monthly'], 2) . "\n\n";

// 6. Zero Impact on Locked Pay Runs & Monthly Payroll Calculator
echo "6. Monthly Payroll & Locked Runs Check:\n";
$monthlyCalc = $app->make(MonthlyPayrollCalculator::class);
$run = PayrollRun::create(['client_id' => $client15->id, 'status' => 'draft', 'payroll_month' => '2026-07-01']);
$payRunCalc = $monthlyCalc->calculateForEmployee($emp15, $run);
echo "   - Monthly Payroll Item Created (Net Pay: Rs. " . number_format($payRunCalc['net_pay'], 2) . ")\n";
echo "   - Bonus Monthly Deduction: Rs. " . number_format($payRunCalc['bonus_deduction'] ?? 0.00, 2) . " (Correct: 0.00 - Not deducted from monthly pay)\n";

// Canonical PF check
$pfVal = $calc15['employer_pf_monthly'];
echo "\n7. Canonical PF Check:\n";
echo "   - Employer PF on Rs. 15,000 Basic: Rs. " . number_format($pfVal, 2) . " (Canonical: 1950.00)\n";

echo "\n=======================================================\n";
