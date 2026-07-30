<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Client;
use App\Models\ClientBranch;
use App\Models\PayrollRun;
use App\Models\Invoice;
use App\Models\ClientContact;
use App\Models\AuditLog;
use App\Services\SalaryCalculationService;
use Illuminate\Support\Facades\Mail;
use App\Mail\ClientInvoiceMail;

// 1. Verify Canonical PF Calculation
$salaryService = new SalaryCalculationService();
$pfResult = $salaryService->calculateStructuralSalary([
    'basic_pay' => 25000,
    'hra' => 5000,
    'da' => 0,
    'pf_applicable' => true,
    'pf_ceiling' => 15000,
    'employee_pf_wage_basis' => 'ceiling',
    'employer_pf_wage_basis' => 'ceiling',
]);

echo "--- CANONICAL PF CHECK ---\n";
echo "Employee PF: ₹" . number_format($pfResult['employee_pf_monthly'], 2) . "\n";
echo "Employer Total PF: ₹" . number_format($pfResult['employer_pf_monthly'], 2) . "\n";
echo "Employer EPF (3.67%): ₹" . number_format($pfResult['employer_epf_monthly'], 2) . "\n";
echo "Employer EPS (8.33%): ₹" . number_format($pfResult['employer_eps_monthly'], 2) . "\n";
echo "Canonical Employer Cost (1950.00 check): " . ($pfResult['employer_pf_monthly'] == 1950.00 ? "PASSED" : "FAILED") . "\n\n";

// 2. DB Proof of Resend & AuditLog
Mail::fake();

$client = Client::firstOrCreate(
    ['client_code' => 'PROOF001'],
    [
        'company_name' => 'DB Proof Client Ltd',
        'company_type' => 'pvt_ltd',
        'registered_address_line_1' => '123 Test St',
        'registered_city' => 'Mumbai',
        'registered_state' => 'Maharashtra',
        'registered_pin' => '400001',
        'contract_type' => 'agency',
        'contract_start_date' => '2026-01-01',
        'billing_model' => 'markup',
        'markup_percentage' => 10.00,
        'primary_poc_name' => 'POC Test',
        'primary_poc_email' => 'poc@test.com',
        'primary_poc_phone' => '9999999999',
        'po_required' => true,
        'po_number' => 'PO-PROOF-001',
        'po_value' => 100000.00,
        'po_validity_date' => '2026-12-31',
        'invoice_footer_notes' => 'DB Proof Footer Notes Remittance Info',
    ]
);

$branch = ClientBranch::firstOrCreate(
    ['client_id' => $client->id, 'branch_code' => 'HQ_PROOF'],
    [
        'branch_name' => 'HQ Branch',
        'address_line_1' => '123 Test St',
        'city' => 'Mumbai',
        'state' => 'Maharashtra',
        'pin_code' => '400001',
        'is_head_office' => true,
        'is_primary_billing_branch' => true,
    ]
);

$payrollRun = PayrollRun::firstOrCreate(
    ['client_id' => $client->id, 'payroll_month' => '2026-07-01'],
    [
        'status' => 'draft',
        'total_employees_processed' => 1,
        'total_gross_earnings' => 50000.00,
        'total_net_disbursement' => 45000.00,
    ]
);

ClientContact::firstOrCreate(
    ['client_id' => $client->id, 'email' => 'poc@test.com'],
    [
        'contact_type' => 'primary',
        'full_name' => 'POC Test',
        'phone' => '9999999999',
        'is_primary_contact' => true,
    ]
);

$initialSentAt = now()->subDays(3);
$invoice = Invoice::create([
    'client_id' => $client->id,
    'branch_id' => $branch->id,
    'payroll_run_id' => $payrollRun->id,
    'agency_gstin' => '27AABCM1234N1ZQ',
    'branch_gstin' => '27AAACM9999N1ZQ',
    'invoice_number' => 'INV-PROOF-' . time(),
    'invoice_month' => '2026-07-01',
    'status' => 'raised',
    'first_sent_at' => $initialSentAt,
    'sent_at' => $initialSentAt,
    'send_count' => 1,
    'sent_by' => 1,
    'sent_to_email' => 'poc@test.com',
    'delivery_status' => 'sent',
    'gross_salary_passthrough' => 50000.00,
    'agency_service_fee' => 5000.00,
    'gst_type' => 'cgst_sgst',
    'gst_amount' => 900.00,
    'grand_total' => 55900.00,
    'due_date' => '2026-08-30',
    'place_of_supply_state' => 'Maharashtra',
]);

echo "--- INITIAL INVOICE STATE ---\n";
echo "Invoice ID: {$invoice->id}\n";
echo "First Sent At: {$invoice->first_sent_at}\n";
echo "Sent At: {$invoice->sent_at}\n";
echo "Send Count: {$invoice->send_count}\n\n";

$controller = new \App\Http\Controllers\InvoiceController(app(\App\Services\InvoicePdfService::class));
$request = \Illuminate\Http\Request::create("/invoices/{$invoice->id}/send-email", 'POST');
$request->headers->set('Accept', 'application/json');

$admin = \App\Models\User::first();
if ($admin) {
    \Illuminate\Support\Facades\Auth::login($admin);
}

$response = $controller->sendEmail($request, $invoice->id);

$invoice->refresh();

echo "--- RESEND INVOICE STATE (AFTER SEND #2) ---\n";
echo "Response Status: " . $response->getStatusCode() . "\n";
echo "First Sent At (UNCHANGED): {$invoice->first_sent_at}\n";
echo "Sent At (UPDATED): {$invoice->sent_at}\n";
echo "Send Count (INCREMENTED): {$invoice->send_count}\n";
echo "Delivery Status: {$invoice->delivery_status}\n\n";

$auditLogs = AuditLog::where('action', 'invoice_email_sent')->get();

echo "--- AUDIT LOG ROWS ---\n";
foreach ($auditLogs as $log) {
    echo "ID: {$log->id} | Action: {$log->action} | User ID: {$log->user_id} | At: {$log->created_at}\n";
}
