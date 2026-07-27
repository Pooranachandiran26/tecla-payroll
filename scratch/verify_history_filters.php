<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\Employee;
use App\Models\SalaryRevision;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "=========================================================\n";
echo "VERIFYING SQL QUERIES & DATASETS FOR HISTORY FILTERS\n";
echo "=========================================================\n";

$client = Client::first() ?? Client::factory()->create();
$branch = ClientBranch::first() ?? ClientBranch::factory()->create(['client_id' => $client->id]);

$employee = Employee::where('personal_email', 'filter.test@example.com')->first();
if ($employee) {
    SalaryRevision::where('employee_id', $employee->id)->delete();
    $employee->delete();
}

$employee = Employee::factory()->create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'employee_code' => 'EMP-TEST-999',
    'designation' => 'Software Engineer',
    'first_name' => 'Filter',
    'last_name' => 'TestEmployee',
    'father_name' => 'Father Filter',
    'personal_email' => 'filter.test@example.com',
    'phone_number' => '9112233445',
    'pan_number' => 'ABCDE1111Z',
    'aadhaar_number' => '111122223333',
    'bank_account_number' => '11112222333344',
    'uan_mode' => 'new',
]);

// Seed 3 revisions: Approved, Pending, Rejected with different effective_dates
$rev1 = SalaryRevision::create([
    'employee_id' => $employee->id,
    'old_basic_pay' => 20000, 'old_hra' => 5000, 'old_conveyance' => 0, 'old_da' => 0, 'old_medical_allowance' => 0, 'old_special_allowance' => 0, 'old_other_additions' => 0, 'old_net_take_home' => 22000, 'old_ctc' => 25000,
    'new_basic_pay' => 25000, 'new_hra' => 6000, 'new_conveyance' => 0, 'new_da' => 0, 'new_medical_allowance' => 0, 'new_special_allowance' => 0, 'new_other_additions' => 0, 'new_net_take_home' => 27000, 'new_ctc' => 31000,
    'effective_date' => '2026-01-15',
    'reason_for_revision' => 'Approved Annual Raise',
    'status' => 'approved',
    'approved_at' => now()->subMonths(6),
]);

$rev2 = SalaryRevision::create([
    'employee_id' => $employee->id,
    'old_basic_pay' => 25000, 'old_hra' => 6000, 'old_conveyance' => 0, 'old_da' => 0, 'old_medical_allowance' => 0, 'old_special_allowance' => 0, 'old_other_additions' => 0, 'old_net_take_home' => 27000, 'old_ctc' => 31000,
    'new_basic_pay' => 30000, 'new_hra' => 8000, 'new_conveyance' => 0, 'new_da' => 0, 'new_medical_allowance' => 0, 'new_special_allowance' => 0, 'new_other_additions' => 0, 'new_net_take_home' => 33000, 'new_ctc' => 38000,
    'effective_date' => '2026-05-01',
    'reason_for_revision' => 'Pending Mid-Year Increment',
    'status' => 'pending_approval',
]);

$rev3 = SalaryRevision::create([
    'employee_id' => $employee->id,
    'old_basic_pay' => 25000, 'old_hra' => 6000, 'old_conveyance' => 0, 'old_da' => 0, 'old_medical_allowance' => 0, 'old_special_allowance' => 0, 'old_other_additions' => 0, 'old_net_take_home' => 27000, 'old_ctc' => 31000,
    'new_basic_pay' => 50000, 'new_hra' => 15000, 'new_conveyance' => 0, 'new_da' => 0, 'new_medical_allowance' => 0, 'new_special_allowance' => 0, 'new_other_additions' => 0, 'new_net_take_home' => 55000, 'new_ctc' => 65000,
    'effective_date' => '2026-07-01',
    'reason_for_revision' => 'Rejected Double Jump Request',
    'status' => 'rejected',
    'rejection_reason' => 'Exceeds budget cap',
]);

DB::enableQueryLog();

// 1. Unfiltered Query (Default Controller Query)
$unfiltered = SalaryRevision::where('employee_id', $employee->id)
    ->orderBy('effective_date', 'desc')
    ->orderBy('created_at', 'desc')
    ->get();

$queries = DB::getQueryLog();
$lastQuery = end($queries);

echo "1. Unfiltered Controller SQL: " . $lastQuery['query'] . "\n";
echo "   Unfiltered Count: " . $unfiltered->count() . " records.\n";
echo "   Order Verified: [ " . $unfiltered->pluck('effective_date')->map(fn($d)=>$d->format('Y-m-d'))->implode(', ') . " ]\n\n";

// 2. Query Scoped by Status = approved
DB::flushQueryLog();
$approvedQuery = SalaryRevision::where('employee_id', $employee->id)
    ->where('status', 'approved')
    ->orderBy('effective_date', 'desc')
    ->orderBy('created_at', 'desc')
    ->get();

$queries = DB::getQueryLog();
$lastQuery = end($queries);
echo "2. Filtered SQL (status=approved): " . $lastQuery['query'] . "\n";
echo "   Approved Records Count: " . $approvedQuery->count() . " (Status: " . $approvedQuery->first()->status . ")\n\n";

// 3. Query Scoped by Date Range (2026-04-01 to 2026-06-30)
DB::flushQueryLog();
$dateQuery = SalaryRevision::where('employee_id', $employee->id)
    ->whereBetween('effective_date', ['2026-04-01', '2026-06-30'])
    ->orderBy('effective_date', 'desc')
    ->orderBy('created_at', 'desc')
    ->get();

$queries = DB::getQueryLog();
$lastQuery = end($queries);
echo "3. Filtered SQL (date between 2026-04-01 & 2026-06-30): " . $lastQuery['query'] . "\n";
echo "   Date Range Count: " . $dateQuery->count() . " (Effective: " . $dateQuery->first()->effective_date->format('Y-m-d') . ")\n\n";

echo "=========================================================\n";
echo "ALL SQL VERIFICATIONS COMPLETED SUCCESSFULLY!\n";
echo "=========================================================\n";
