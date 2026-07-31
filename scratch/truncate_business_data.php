<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== TRUNCATING BUSINESS DATA TABLES ===\n\n";

$tablesToTruncate = [
    'invoice_fees',
    'invoice_items',
    'invoices',
    'payroll_run_items',
    'payroll_runs',
    'employee_loan_repayments',
    'employee_loans',
    'employee_exit_settlements',
    'employee_salary_revisions',
    'tax_declarations',
    'bank_change_requests',
    'day_swaps',
    'employee_documents',
    'app_notifications',
    'attendance_logs',
    'employees',
    'client_branches',
    'client_contacts',
    'client_documents',
    'client_holidays',
    'clients',
];

DB::statement('SET FOREIGN_KEY_CHECKS=0;');

foreach ($tablesToTruncate as $table) {
    if (Schema::hasTable($table)) {
        DB::table($table)->truncate();
        echo "✓ Truncated table: {$table}\n";
    } else {
        echo "- Table not found: {$table} (skipped)\n";
    }
}

DB::statement('SET FOREIGN_KEY_CHECKS=1;');

echo "\n=== BUSINESS DATA SUCCESSFULLY CLEARED ===\n";
echo "Preserved admin users, system roles, and migrations intact.\n";
