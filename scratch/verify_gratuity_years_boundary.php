<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Services\FullAndFinalCalculationService;
use Carbon\Carbon;

$client = Client::factory()->create();
$branch = ClientBranch::factory()->create(['client_id' => $client->id]);

// Scenario A: 6 Years 5 Months (Jan 1, 2020 to Jun 1, 2026 = 151 extra days)
$dojA = Carbon::parse('2020-01-01');
$lwdA = Carbon::parse('2026-06-01');
$empA = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'date_of_joining' => $dojA->toDateString(),
    'employment_type' => 'permanent',
    'basic_pay' => 26000.00,
    'da' => 0.00,
    'pan_number' => 'MH6Y5M' . rand(1000, 9999) . 'F',
    'aadhaar_number' => '99' . rand(1000000000, 9999999999),
    'bank_account_number' => '99' . rand(1000000000, 9999999999),
    'uan_mode' => 'new',
]);

// Scenario B: 6 Years 7 Months (Jan 1, 2020 to Aug 5, 2026 = 216 extra days)
$dojB = Carbon::parse('2020-01-01');
$lwdB = Carbon::parse('2026-08-05');
$empB = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'date_of_joining' => $dojB->toDateString(),
    'employment_type' => 'permanent',
    'basic_pay' => 26000.00,
    'da' => 0.00,
    'pan_number' => 'MH6Y7M' . rand(1000, 9999) . 'F',
    'aadhaar_number' => '99' . rand(1000000000, 9999999999),
    'bank_account_number' => '99' . rand(1000000000, 9999999999),
    'uan_mode' => 'new',
]);

$service = new FullAndFinalCalculationService();

$fullYearsA = (int) $dojA->diffInYears($lwdA);
$extraDaysA = (int) $dojA->copy()->addYears($fullYearsA)->diffInDays($lwdA);
$gratuityYearsA = ($extraDaysA >= 182) ? $fullYearsA + 1 : $fullYearsA;
$previewA = $service->calculatePreview($empA, ['last_working_day' => $lwdA->toDateString()]);

$fullYearsB = (int) $dojB->diffInYears($lwdB);
$extraDaysB = (int) $dojB->copy()->addYears($fullYearsB)->diffInDays($lwdB);
$gratuityYearsB = ($extraDaysB >= 182) ? $fullYearsB + 1 : $fullYearsB;
$previewB = $service->calculatePreview($empB, ['last_working_day' => $lwdB->toDateString()]);

echo "=== REAL BOUNDARY VERIFICATION OUTPUT ===" . PHP_EOL;
echo "1. Scenario 6 Years 5 Months (Jan 1, 2020 to Jun 1, 2026):" . PHP_EOL;
echo "   - Completed Full Years: " . $fullYearsA . " years" . PHP_EOL;
echo "   - Extra Days Completed: " . $extraDaysA . " days (< 182 days threshold)" . PHP_EOL;
echo "   - Resolved gratuityYears Multiplier: " . $gratuityYearsA . " years" . PHP_EOL;
echo "   - Final Computed Gratuity Amount:    Rs. " . number_format($previewA['gratuity_amount'], 2) . PHP_EOL . PHP_EOL;

echo "2. Scenario 6 Years 7 Months (Jan 1, 2020 to Aug 5, 2026):" . PHP_EOL;
echo "   - Completed Full Years: " . $fullYearsB . " years" . PHP_EOL;
echo "   - Extra Days Completed: " . $extraDaysB . " days (>= 182 days threshold)" . PHP_EOL;
echo "   - Resolved gratuityYears Multiplier: " . $gratuityYearsB . " years" . PHP_EOL;
echo "   - Final Computed Gratuity Amount:    Rs. " . number_format($previewB['gratuity_amount'], 2) . PHP_EOL;
