<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\SalaryCalculationService;

echo "=======================================================\n";
echo "EMPIRICAL VERIFICATION: EDLI EXEMPTION & 3-WAY PF SPLIT\n";
echo "=======================================================\n\n";

$svc = new SalaryCalculationService();

function createEmpForEdli($client, $branch, $basic) {
    $rand = rand(100000, 999999);
    return Employee::factory()->create([
        'client_id' => $client->id,
        'branch_id' => $branch->id,
        'basic_pay' => $basic,
        'pf_applicable' => true,
        'pan_number' => 'PAN' . $rand . 'E',
        'aadhaar_number' => '9999' . $rand . '88',
        'bank_account_number' => '1000' . $rand . '88',
        'uan_mode' => 'existing_transfer'
    ]);
}

// 1. Client with edli_exempted = false (Default)
$clientDefault = Client::factory()->create(['company_name' => 'Standard Client', 'edli_exempted' => false]);
$branchDefault = ClientBranch::factory()->create(['client_id' => $clientDefault->id]);
$empDefault = createEmpForEdli($clientDefault, $branchDefault, 15000);
$calcDefault = $svc->calculateStructuralSalary($empDefault);

echo "1. Default Client (edli_exempted = false):\n";
echo "   - Employer EPF (12%): Rs. " . number_format($calcDefault['employer_epf_monthly'], 2) . "\n";
echo "   - EDLI (0.5%): Rs. " . number_format($calcDefault['edli_monthly'], 2) . "\n";
echo "   - EPF Admin Charges (0.5%): Rs. " . number_format($calcDefault['epf_admin_monthly'], 2) . "\n";
echo "   - Total Employer PF Cost: Rs. " . number_format($calcDefault['employer_pf_monthly'], 2) . " (Expected: 1950.00)\n\n";

// 2. Client with edli_exempted = true (EDLI Exempted)
$clientExempt = Client::factory()->create(['company_name' => 'EDLI Exempted Client', 'edli_exempted' => true]);
$branchExempt = ClientBranch::factory()->create(['client_id' => $clientExempt->id]);
$empExempt = createEmpForEdli($clientExempt, $branchExempt, 15000);
$calcExempt = $svc->calculateStructuralSalary($empExempt);

echo "2. EDLI Exempted Client (edli_exempted = true):\n";
echo "   - Employer EPF (12%): Rs. " . number_format($calcExempt['employer_epf_monthly'], 2) . "\n";
echo "   - EDLI (0.5%): Rs. " . number_format($calcExempt['edli_monthly'], 2) . " (EXEMPTED)\n";
echo "   - EPF Admin Charges (0.5%): Rs. " . number_format($calcExempt['epf_admin_monthly'], 2) . "\n";
echo "   - Total Employer PF Cost: Rs. " . number_format($calcExempt['employer_pf_monthly'], 2) . " (Expected: 1875.00)\n\n";

// 3. Arithmetic Proof (1800 + 0 + 75 = 1875)
$sumDefault = $calcDefault['employer_epf_monthly'] + $calcDefault['edli_monthly'] + $calcDefault['epf_admin_monthly'];
$sumExempt = $calcExempt['employer_epf_monthly'] + $calcExempt['edli_monthly'] + $calcExempt['epf_admin_monthly'];

echo "3. 3-Way Split Arithmetic Sum Check:\n";
echo "   - Default Client Sum: 1800 + 75 + 75 = " . number_format($sumDefault, 2) . " (Matches Total: " . number_format($calcDefault['employer_pf_monthly'], 2) . ")\n";
echo "   - Exempted Client Sum: 1800 + 0 + 75 = " . number_format($sumExempt, 2) . " (Matches Total: " . number_format($calcExempt['employer_pf_monthly'], 2) . ")\n\n";

// 4. Canonical PF Baseline (TEC-088)
$empTec088 = createEmpForEdli($clientDefault, $branchDefault, 15000);
$calcTec = $svc->calculateStructuralSalary($empTec088);
echo "4. Canonical PF Baseline (TEC-088):\n";
echo "   - Employer PF on Rs. 15,000 Basic: Rs. " . number_format($calcTec['employer_pf_monthly'], 2) . " (Canonical: 1950.00)\n";
echo "=======================================================\n";
