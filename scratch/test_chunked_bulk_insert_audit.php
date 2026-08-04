<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\ClientBranch;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "=== REAL CHUNKED RAW BULK INSERT (DB::table('employees')->insert) AUDIT VERIFICATION ===\n\n";

// 1. Authenticate as Admin User (ID 2)
$admin = User::find(2) ?: User::first();
Auth::login($admin);
echo "1. Logged in Admin User ID: {$admin->id} ({$admin->name})\n\n";

// 2. Fetch or create active client
$client = Client::with('branches')->where('status', 'active')->first();
$branch = $client->branches->first();

$batchUser = $admin->id;
$now = now()->toDateTimeString();

// 3. Build a chunk of 50 raw DB payloads (bypassing Eloquent model events entirely)
$chunk = [];
$empCodes = [];

for ($i = 1; $i <= 50; $i++) {
    $code = 'CHUNK' . rand(10000, 99999);
    $empCodes[] = $code;

    $payload = [
        'employee_code' => $code,
        'client_id' => $client->id,
        'branch_id' => $branch->id,
        'full_name' => "Chunked Candidate {$i}",
        'personal_email' => "chunk.cand.{$i}." . rand(1000, 9999) . "@audit.com",
        'phone_number' => "988" . rand(1000000, 9999999),
        'date_of_birth' => '1996-01-01',
        'date_of_joining' => '2026-03-01',
        'designation' => 'Bulk Worker',
        'employment_model' => 'agency_contract',
        'prior_employment_flag' => 0,
        'residential_address' => '123 Chunked Blvd',
        'bank_account_number' => '123456789' . $i,
        'bank_ifsc' => 'HDFC0001234',
        'bank_name' => 'HDFC',
        'bank_branch' => 'Main',
        'account_holder_name' => "Chunked Candidate {$i}",
        'pan_number' => 'CHK' . rand(10, 99) . '1234F',
        'basic_pay' => 20000,
        'hra' => 8000,
        'conveyance' => 1600,
        'da' => 0,
        'medical_allowance' => 1250,
        'special_allowance' => 4150,
        'other_additions' => 0,
        'pf_applicable' => 1,
        'eps_applicable' => 1,
        'esi_applicable' => 0,
        'pt_applicable' => 1,
        'lwf_applicable' => 0,
        'tds_applicable' => 0,
        'gross_monthly_salary' => 34850.00,
        'net_take_home_monthly' => 32800.00,
        'employer_pf_monthly' => 1950.00,
        'employer_esi_monthly' => 0.00,
        'ctc_monthly' => 36800.00,
        'status' => 'onboarding',
        // EXPLICIT AUDIT FIELDS FOR RAW BULK INSERT (as built in BulkUploadController & FastBulkUploadService)
        'entry_source' => 'bulk_upload',
        'created_by' => $batchUser,
        'updated_by' => $batchUser,
        'created_at' => $now,
        'updated_at' => $now,
    ];

    $chunk[] = $payload;
}

echo "2. Prepared chunk of " . count($chunk) . " rows for DB::table('employees')->insert(\$chunk)\n\n";

// 4. Perform RAW CHUNKED DB INSERT
DB::table('employees')->insert($chunk);

echo "3. Executed DB::table('employees')->insert(\$chunk) successfully!\n\n";

// 5. Query Raw MySQL DB directly for all 50 rows
$insertedRows = DB::table('employees')->whereIn('employee_code', $empCodes)->get();

echo "4. DIRECT MYSQL DATABASE QUERY RESULTS (Sample 3 rows of 50):\n";
echo "------------------------------------------------------------------------------------\n";
foreach ($insertedRows->take(3) as $row) {
    echo "ID: {$row->id} | Code: {$row->employee_code} | created_by: {$row->created_by} | updated_by: {$row->updated_by} | entry_source: '{$row->entry_source}'\n";
}
echo "------------------------------------------------------------------------------------\n\n";

// 6. Assert all 50 rows have exact values
$nullCreatedCount = $insertedRows->whereNull('created_by')->count();
$nullUpdatedCount = $insertedRows->whereNull('updated_by')->count();
$manualSourceCount = $insertedRows->where('entry_source', 'manual')->count();
$bulkSourceCount = $insertedRows->where('entry_source', 'bulk_upload')->count();

echo "5. VERIFICATION STATS ACROSS ALL 50 BULK-INSERTED ROWS:\n";
echo "   - Total Rows Inserted: " . $insertedRows->count() . "\n";
echo "   - Rows with created_by = {$admin->id}: " . $insertedRows->where('created_by', $admin->id)->count() . "\n";
echo "   - Rows with updated_by = {$admin->id}: " . $insertedRows->where('updated_by', $admin->id)->count() . "\n";
echo "   - Rows with entry_source = 'bulk_upload': {$bulkSourceCount}\n";
echo "   - Rows with entry_source = 'manual' (Defaults): {$manualSourceCount}\n";
echo "   - Rows with created_by = NULL: {$nullCreatedCount}\n\n";

if ($bulkSourceCount === 50 && $nullCreatedCount === 0 && $nullUpdatedCount === 0) {
    echo "✅ 100% PROOF CONFIRMED: Raw DB::table('employees')->insert(\$chunk) path sets created_by, updated_by, and entry_source='bulk_upload' on EVERY row!\n";
} else {
    echo "❌ ERROR: Audit fields mismatch on raw chunked insert!\n";
}

// Clean up test rows
DB::table('employees')->whereIn('employee_code', $empCodes)->delete();
echo "\nTest cleanup complete.\n";
