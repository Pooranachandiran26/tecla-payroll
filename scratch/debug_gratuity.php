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

$doj = Carbon::parse('2020-01-01');
$lwd = $doj->copy()->addDays((4 * 365) + 240); // 2024-08-28 (1700 days)

$employee = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'date_of_joining' => $doj->toDateString(),
    'employment_type' => 'permanent',
    'basic_pay' => 26000.00,
    'da' => 0.00,
    'pan_number' => 'ABCDE' . rand(1000, 9999) . 'F',
    'aadhaar_number' => '99' . rand(1000000000, 9999999999),
    'bank_account_number' => '99' . rand(1000000000, 9999999999),
    'uan_mode' => 'new',
]);

$fullYears = (int) $doj->diffInYears($lwd);
$lastAnniversary = $doj->copy()->addYears($fullYears);
$extraDays = (int) $lastAnniversary->diffInDays($lwd);
$gratuityYears = ($extraDays >= 182) ? $fullYears + 1 : $fullYears;

echo "Full Years (int):  " . $fullYears . PHP_EOL;
echo "Extra Days (int):  " . $extraDays . PHP_EOL;
echo "Gratuity Years:    " . $gratuityYears . PHP_EOL;
echo "Computed Amount:   " . ((26000 / 26) * 15 * $gratuityYears) . PHP_EOL;
