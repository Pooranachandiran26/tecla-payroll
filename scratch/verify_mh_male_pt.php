<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Services\MonthlyPayrollCalculator;
use Database\Seeders\PtSlabSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::call('db:seed', ['--class' => 'PtSlabSeeder']);

$client = Client::factory()->create(['registered_state' => 'Maharashtra', 'pt_state' => 'Maharashtra']);
$branch = ClientBranch::factory()->create(['client_id' => $client->id, 'state' => 'Maharashtra']);

// Employee 1: Gross 20,000 (Male)
$emp20k = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'gender' => 'male',
    'date_of_joining' => '2020-01-01',
    'uan_mode' => 'new',
    'pan_number' => 'MH20K' . rand(1000, 9999) . 'F',
    'aadhaar_number' => '99' . rand(1000000000, 9999999999),
    'bank_account_number' => '99' . rand(1000000000, 9999999999),
    'basic_pay' => 10000,
    'hra' => 5000,
    'special_allowance' => 5000,
    'gross_monthly_salary' => 20000,
    'pt_applicable' => true,
]);

// Employee 2: Gross 9,000 (Male)
$emp9k = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'gender' => 'male',
    'date_of_joining' => '2020-01-01',
    'uan_mode' => 'new',
    'pan_number' => 'MH09K' . rand(1000, 9999) . 'F',
    'aadhaar_number' => '99' . rand(1000000000, 9999999999),
    'bank_account_number' => '99' . rand(1000000000, 9999999999),
    'basic_pay' => 5000,
    'hra' => 4000,
    'gross_monthly_salary' => 9000,
    'pt_applicable' => true,
]);

for ($d = 1; $d <= 31; $d++) {
    $dateStr = '2026-07-' . sprintf('%02d', $d);
    DB::table('attendance_records')->insert(['employee_id' => $emp20k->id, 'attendance_date' => $dateStr, 'status' => 'present', 'source' => 'live_punch', 'created_at' => now(), 'updated_at' => now()]);
    DB::table('attendance_records')->insert(['employee_id' => $emp9k->id, 'attendance_date' => $dateStr, 'status' => 'present', 'source' => 'live_punch', 'created_at' => now(), 'updated_at' => now()]);
}

$run = PayrollRun::create(['client_id' => $client->id, 'payroll_month' => '2026-07-01', 'status' => 'draft']);

$calc = app(MonthlyPayrollCalculator::class);
$res20k = $calc->calculateForEmployee($emp20k, $run);
$res9k = $calc->calculateForEmployee($emp9k, $run);

echo "=== REAL COMPUTED VALUES FROM MonthlyPayrollCalculator ===" . PHP_EOL;
echo "1. Male Employee with Gross Rs. 20,000:" . PHP_EOL;
echo "   - Gross Computed: Rs. " . number_format($res20k['gross_total'], 2) . PHP_EOL;
echo "   - PT Computed:    Rs. " . number_format($res20k['professional_tax'], 2) . " (Bracket: > Rs. 10,000 => Rs. 200/month)" . PHP_EOL;

echo "2. Male Employee with Gross Rs. 9,000:" . PHP_EOL;
echo "   - Gross Computed: Rs. " . number_format($res9k['gross_total'], 2) . PHP_EOL;
echo "   - PT Computed:    Rs. " . number_format($res9k['professional_tax'], 2) . " (Bracket: Rs. 7,501 - Rs. 10,000 => Rs. 175/month)" . PHP_EOL;
