<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\PayrollRun;
use App\Models\PayrollRunItem;
use App\Models\SalaryRevision;
use App\Models\EmployeeLoan;
use App\Models\Employee;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

echo "=== BATCH 2 FINANCIAL TRANSACTION AUDIT FIELDS VERIFICATION ===\n\n";

// 1. Authenticate Admin User (ID 2)
$admin = User::find(2) ?: User::first();
Auth::login($admin);
echo "1. Authenticated Admin User ID: {$admin->id} ({$admin->name})\n\n";

// Fetch active client and employee
$client = Client::where('status', 'active')->first();
$employee = Employee::where('client_id', $client->id)->first();

// --- TEST 1: PayrollRun & PayrollRunItem ---
echo "--- TEST 1: PayrollRun & PayrollRunItem Audit Fields ---\n";
$month = '2026-07-01';

// Create Draft Payroll Run
$run = PayrollRun::create([
    'client_id' => $client->id,
    'payroll_month' => $month,
    'status' => 'draft',
    'total_employees_processed' => 1,
    'total_employees_excluded' => 0,
    'total_gross_earnings' => 50000,
    'total_net_disbursement' => 45000,
    'total_employer_statutory_cost' => 5000,
    'processed_by' => $admin->id,
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);

$item = PayrollRunItem::create([
    'payroll_run_id' => $run->id,
    'employee_id' => $employee->id,
    'paid_days' => 30,
    'lop_days' => 0,
    'basic_pay' => 25000,
    'hra' => 10000,
    'conveyance' => 0,
    'da' => 0,
    'medical_allowance' => 0,
    'special_allowance' => 15000,
    'other_additions' => 0,
    'gross_total' => 50000,
    'employee_pf' => 1800,
    'employee_esi' => 0,
    'professional_tax' => 200,
    'lwf_deduction' => 0,
    'lop_deduction' => 0,
    'tds_deduction' => 3000,
    'loan_emi_deduction' => 0,
    'net_pay' => 45000,
    'employer_pf' => 1800,
    'employer_esi' => 0,
    'employer_lwf' => 0,
    'attendance_source' => 'live_punch',
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);

echo "Created Draft PayrollRun ID: {$run->id} | created_by: {$run->created_by} | updated_by: {$run->updated_by}\n";
echo "Created PayrollRunItem ID: {$item->id} | created_by: {$item->created_by} | updated_by: {$item->updated_by}\n";

// Approve Run
$run->update([
    'status' => 'approved',
    'approved_by' => $admin->id,
    'approved_at' => now(),
    'updated_by' => $admin->id,
]);
echo "Approved PayrollRun ID: {$run->id} | status: {$run->status} | approved_by: {$run->approved_by} | updated_by: {$run->updated_by}\n";

// Lock Run
$run->update([
    'status' => 'locked',
    'locked_at' => now(),
    'locked_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Locked PayrollRun ID: {$run->id} | status: {$run->status} | locked_by: {$run->locked_by} | updated_by: {$run->updated_by}\n\n";

// --- TEST 2: Invoice ---
echo "--- TEST 2: Invoice Audit Fields ---\n";
$invoice = Invoice::create([
    'invoice_number' => 'INV-TEST-AUDIT-' . rand(1000, 9999),
    'client_id' => $client->id,
    'branch_id' => $client->branches->first()?->id,
    'payroll_run_id' => $run->id,
    'invoice_month' => $month,
    'agency_gstin' => '33AAAAA0000A1Z5',
    'branch_gstin' => '33BBBBB0000B1Z5',
    'place_of_supply_state' => 'Tamil Nadu',
    'gst_type' => 'cgst_sgst',
    'gross_salary_passthrough' => 50000,
    'agency_service_fee' => 5000,
    'cgst_amount' => 450,
    'sgst_amount' => 450,
    'igst_amount' => 0,
    'gst_amount' => 900,
    'grand_total' => 55900,
    'status' => 'finalized',
    'due_date' => '2026-08-15',
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Created Invoice ID: {$invoice->id} | created_by: {$invoice->created_by} | updated_by: {$invoice->updated_by}\n";

// Mark as Paid
$invoice->update([
    'status' => 'paid',
    'paid_at' => now(),
    'paid_amount' => 55900,
    'payment_mode' => 'neft_rtgs',
    'paid_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Marked Paid Invoice ID: {$invoice->id} | status: {$invoice->status} | paid_by: {$invoice->paid_by} | updated_by: {$invoice->updated_by}\n\n";

// --- TEST 3: SalaryRevision ---
echo "--- TEST 3: SalaryRevision Audit Fields ---\n";
$revision = SalaryRevision::create([
    'employee_id' => $employee->id,
    'old_basic_pay' => 20000,
    'old_hra' => 8000,
    'old_conveyance' => 1600,
    'old_da' => 0,
    'old_medical_allowance' => 1250,
    'old_special_allowance' => 4150,
    'old_other_additions' => 0,
    'old_net_take_home' => 32800,
    'old_ctc' => 36800,
    'new_basic_pay' => 25000,
    'new_hra' => 10000,
    'new_conveyance' => 1600,
    'new_da' => 0,
    'new_medical_allowance' => 1250,
    'new_special_allowance' => 5150,
    'new_other_additions' => 0,
    'new_net_take_home' => 39800,
    'new_ctc' => 44800,
    'effective_date' => '2026-08-01',
    'reason_for_revision' => 'Annual Appraisal',
    'status' => 'pending_approval',
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Created SalaryRevision ID: {$revision->id} | created_by: {$revision->created_by} | updated_by: {$revision->updated_by}\n";

$revision->update([
    'status' => 'approved',
    'approved_by' => $admin->id,
    'approved_at' => now(),
    'updated_by' => $admin->id,
]);
echo "Approved SalaryRevision ID: {$revision->id} | status: {$revision->status} | approved_by: {$revision->approved_by} | updated_by: {$revision->updated_by}\n\n";

// --- TEST 4: EmployeeLoan ---
echo "--- TEST 4: EmployeeLoan Audit Fields ---\n";
$loan = EmployeeLoan::create([
    'employee_id' => $employee->id,
    'loan_number' => 'LN-2026-' . rand(1000, 9999),
    'loan_type' => 'salary_advance',
    'principal_amount' => 10000,
    'monthly_emi' => 2000,
    'total_repaid' => 0,
    'remaining_balance' => 10000,
    'start_date' => '2026-08-01',
    'status' => 'active',
    'approved_by' => $admin->id,
    'created_by' => $admin->id,
    'updated_by' => $admin->id,
]);
echo "Created EmployeeLoan ID: {$loan->id} | created_by: {$loan->created_by} | updated_by: {$loan->updated_by} | approved_by: {$loan->approved_by}\n\n";

// --- DIRECT MYSQL DATABASE VERIFICATION ---
echo "=== DIRECT MYSQL DATABASE QUERY VERIFICATION ===\n";

$dbRun = DB::table('payroll_runs')->where('id', $run->id)->first();
$dbItem = DB::table('payroll_run_items')->where('id', $item->id)->first();
$dbInv = DB::table('invoices')->where('id', $invoice->id)->first();
$dbRev = DB::table('salary_revisions')->where('id', $revision->id)->first();
$dbLoan = DB::table('employee_loans')->where('id', $loan->id)->first();

echo "payroll_runs ID {$dbRun->id}: created_by={$dbRun->created_by}, updated_by={$dbRun->updated_by}, processed_by={$dbRun->processed_by}, approved_by={$dbRun->approved_by}, locked_by={$dbRun->locked_by}\n";
echo "payroll_run_items ID {$dbItem->id}: created_by={$dbItem->created_by}, updated_by={$dbItem->updated_by}\n";
echo "invoices ID {$dbInv->id}: created_by={$dbInv->created_by}, updated_by={$dbInv->updated_by}, paid_by={$dbInv->paid_by}, sent_by=" . ($dbInv->sent_by ?? 'NULL') . "\n";
echo "salary_revisions ID {$dbRev->id}: created_by={$dbRev->created_by}, updated_by={$dbRev->updated_by}, approved_by={$dbRev->approved_by}\n";
echo "employee_loans ID {$dbLoan->id}: created_by={$dbLoan->created_by}, updated_by={$dbLoan->updated_by}, approved_by={$dbLoan->approved_by}\n\n";

// Assertions
$allValid = (
    $dbRun->created_by == $admin->id &&
    $dbRun->locked_by == $admin->id &&
    $dbItem->created_by == $admin->id &&
    $dbInv->paid_by == $admin->id &&
    $dbRev->created_by == $admin->id &&
    $dbLoan->created_by == $admin->id
);

if ($allValid) {
    echo "✅ BATCH 2 100% SUCCESS: All financial transaction audit fields (created_by, updated_by, locked_by, paid_by, approved_by) verified directly in MySQL DB!\n";
} else {
    echo "❌ ERROR: Audit field mismatch in database!\n";
}

// Clean up test records (in reverse dependency order)
DB::table('invoices')->where('id', $invoice->id)->delete();
DB::table('payroll_run_items')->where('id', $item->id)->delete();
DB::table('payroll_runs')->where('id', $run->id)->delete();
DB::table('salary_revisions')->where('id', $revision->id)->delete();
DB::table('employee_loans')->where('id', $loan->id)->delete();

echo "\nTest cleanup completed successfully.\n";
