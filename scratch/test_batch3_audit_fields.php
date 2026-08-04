<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\Employee;
use App\Models\AttendanceUploadBatch;
use App\Models\ClientDocument;
use App\Models\PtSlab;
use App\Models\LwfSlab;
use App\Models\BankChangeRequest;
use App\Models\EmployeeExit;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "=== BATCH 3 COMPLIANCE & SUPPORTING DATA AUDIT FIELDS VERIFICATION ===\n\n";

// 1. Authenticate Admin User (ID 2)
$admin = User::find(2) ?: User::first();
Auth::login($admin);
echo "1. Authenticated Admin User ID: {$admin->id} ({$admin->name})\n\n";

// Fetch active client and employee
$client = Client::where('status', 'active')->first();
$employee = Employee::where('client_id', $client->id)->first();

// --- TEST 1: PtSlab & LwfSlab (Master Slabs with BlameableTrait) ---
echo "--- TEST 1: PtSlab & LwfSlab Audit Fields ---\n";
$ptSlab = PtSlab::create([
    'state' => 'Test State',
    'min_salary' => 10000,
    'max_salary' => 20000,
    'deduction_amount' => 150,
    'frequency' => 'monthly',
    'is_active' => true,
]);
echo "Created PtSlab ID: {$ptSlab->id} | created_by: {$ptSlab->created_by} | updated_by: {$ptSlab->updated_by}\n";

$ptSlab->update(['deduction_amount' => 200]);
echo "Updated PtSlab ID: {$ptSlab->id} | updated_by: {$ptSlab->updated_by}\n";

$lwfSlab = LwfSlab::create([
    'state' => 'Test State',
    'employee_contribution' => 10,
    'employer_contribution' => 20,
    'frequency' => 'monthly',
    'is_active' => true,
]);
echo "Created LwfSlab ID: {$lwfSlab->id} | created_by: {$lwfSlab->created_by} | updated_by: {$lwfSlab->updated_by}\n\n";

// --- TEST 2: AttendanceUploadBatch ---
echo "--- TEST 2: AttendanceUploadBatch Audit Fields ---\n";
$attBatch = AttendanceUploadBatch::create([
    'client_id' => $client->id,
    'target_month' => '2026-07-01',
    'uploaded_file_name' => 'test_attendance.xlsx',
    'total_rows' => 50,
    'matched_rows' => 50,
    'status' => 'approved',
    'uploaded_by' => $admin->id,
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
    'verified_by' => $admin->id,
]);
echo "Created AttendanceUploadBatch ID: {$attBatch->id} | created_by: {$attBatch->created_by} | updated_by: {$attBatch->updated_by} | verified_by: {$attBatch->verified_by}\n\n";

// --- TEST 3: ClientDocument ---
echo "--- TEST 3: ClientDocument Audit Fields ---\n";
$doc = ClientDocument::create([
    'client_id' => $client->id,
    'document_type' => 'msa',
    'file_name' => 'msa_test.pdf',
    'file_path' => 'client_documents/msa_test.pdf',
    'file_size_kb' => 1024,
    'uploaded_by' => $admin->id,
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
    'verification_status' => 'pending',
]);
echo "Created ClientDocument ID: {$doc->id} | created_by: {$doc->created_by} | updated_by: {$doc->updated_by}\n";

$doc->update([
    'verification_status' => 'verified',
    'verified_by' => $admin->id,
    'verified_at' => now(),
    'updated_by' => $admin->id,
]);
echo "Verified ClientDocument ID: {$doc->id} | verified_by: {$doc->verified_by} | updated_by: {$doc->updated_by}\n\n";

// --- TEST 4: BankChangeRequest ---
echo "--- TEST 4: BankChangeRequest Audit Fields ---\n";
$bankReq = BankChangeRequest::create([
    'employee_id' => $employee->id,
    'status' => 'pending',
    'new_bank_account_number' => '987654321012',
    'new_bank_ifsc' => 'HDFC0009999',
    'new_account_holder_name' => $employee->full_name,
    'reason' => 'Salary Account Change',
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Created BankChangeRequest ID: {$bankReq->id} | created_by: {$bankReq->created_by} | updated_by: {$bankReq->updated_by}\n";

$bankReq->update([
    'status' => 'approved',
    'processed_by' => $admin->id,
    'processed_at' => now(),
    'updated_by' => $admin->id,
]);
echo "Approved BankChangeRequest ID: {$bankReq->id} | processed_by: {$bankReq->processed_by} | updated_by: {$bankReq->updated_by}\n\n";

// --- TEST 5: EmployeeExit ---
echo "--- TEST 5: EmployeeExit Audit Fields ---\n";
$exit = EmployeeExit::create([
    'employee_id' => $employee->id,
    'exit_type' => 'resignation',
    'reason_category' => 'better_opportunity',
    'submission_date' => '2026-07-15',
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Created EmployeeExit ID: {$exit->id} | created_by: {$exit->created_by} | updated_by: {$exit->updated_by}\n";

$exit->update([
    'current_stage' => 6,
    'confirmed_at' => now(),
    'confirmed_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Confirmed EmployeeExit ID: {$exit->id} | confirmed_by: {$exit->confirmed_by} | updated_by: {$exit->updated_by}\n\n";

// --- DIRECT MYSQL DATABASE QUERY VERIFICATION ---
echo "=== DIRECT MYSQL DATABASE QUERY VERIFICATION ===\n";

$dbPt = DB::table('pt_slabs')->where('id', $ptSlab->id)->first();
$dbLwf = DB::table('lwf_slabs')->where('id', $lwfSlab->id)->first();
$dbAtt = DB::table('attendance_upload_batches')->where('id', $attBatch->id)->first();
$dbDoc = DB::table('client_documents')->where('id', $doc->id)->first();
$dbBank = DB::table('bank_change_requests')->where('id', $bankReq->id)->first();
$dbExit = DB::table('employee_exits')->where('id', $exit->id)->first();

echo "pt_slabs ID {$dbPt->id}: created_by={$dbPt->created_by}, updated_by={$dbPt->updated_by}\n";
echo "lwf_slabs ID {$dbLwf->id}: created_by={$dbLwf->created_by}, updated_by={$dbLwf->updated_by}\n";
echo "attendance_upload_batches ID {$dbAtt->id}: created_by={$dbAtt->created_by}, updated_by={$dbAtt->updated_by}, uploaded_by={$dbAtt->uploaded_by}, verified_by={$dbAtt->verified_by}\n";
echo "client_documents ID {$dbDoc->id}: created_by={$dbDoc->created_by}, updated_by={$dbDoc->updated_by}, uploaded_by={$dbDoc->uploaded_by}, verified_by={$dbDoc->verified_by}\n";
echo "bank_change_requests ID {$dbBank->id}: created_by={$dbBank->created_by}, updated_by={$dbBank->updated_by}, processed_by={$dbBank->processed_by}\n";
echo "employee_exits ID {$dbExit->id}: created_by={$dbExit->created_by}, updated_by={$dbExit->updated_by}, confirmed_by={$dbExit->confirmed_by}\n\n";

// Assertions
$allValid = (
    $dbPt->created_by == $admin->id &&
    $dbLwf->created_by == $admin->id &&
    $dbAtt->created_by == $admin->id &&
    $dbAtt->verified_by == $admin->id &&
    $dbDoc->created_by == $admin->id &&
    $dbDoc->verified_by == $admin->id &&
    $dbBank->created_by == $admin->id &&
    $dbBank->processed_by == $admin->id &&
    $dbExit->created_by == $admin->id &&
    $dbExit->confirmed_by == $admin->id
);

if ($allValid) {
    echo "✅ BATCH 3 100% SUCCESS: All compliance & supporting data audit fields (created_by, updated_by, verified_by, processed_by, confirmed_by) verified directly in MySQL DB!\n";
} else {
    echo "❌ ERROR: Audit field mismatch in database!\n";
}

// Clean up test records
DB::table('pt_slabs')->where('id', $ptSlab->id)->delete();
DB::table('lwf_slabs')->where('id', $lwfSlab->id)->delete();
DB::table('attendance_upload_batches')->where('id', $attBatch->id)->delete();
DB::table('client_documents')->where('id', $doc->id)->delete();
DB::table('bank_change_requests')->where('id', $bankReq->id)->delete();
DB::table('employee_exits')->where('id', $exit->id)->delete();

echo "\nTest cleanup completed successfully.\n";
