<?php

use App\Models\Employee;
use App\Models\Client;
use App\Models\ClientBranch;
use Illuminate\Support\Facades\DB;

// Cleanup first
DB::statement('SET FOREIGN_KEY_CHECKS=0;');
Employee::truncate();
ClientBranch::truncate();
Client::truncate();
DB::statement('SET FOREIGN_KEY_CHECKS=1;');

$client = new Client();
$client->client_code = 'TEST-' . rand(100,999);
$client->company_name = 'Test';
$client->contract_type = 'agency_payroll';
$client->contract_start_date = '2026-01-01';
$client->billing_model = 'fixed_fee';
$client->primary_poc_name = 'A';
$client->primary_poc_email = 'a@b.com';
$client->primary_poc_phone = '123';
$client->save();

$branch = new ClientBranch();
$branch->client_id = $client->id;
$branch->branch_name = 'Test Branch';
$branch->save();

$emp = new Employee();
$emp->employee_code = 'EMP-' . rand(1000,9999);
$emp->client_id = $client->id;
$emp->branch_id = $branch->id;
$emp->full_name = 'Test User';
$emp->personal_email = 'test@example.com';
$emp->phone_number = '9999999999';
$emp->date_of_birth = '1990-01-01';
$emp->date_of_joining = '2026-01-01';
$emp->designation = 'Developer';
$emp->employment_model = 'eor';
$emp->basic_pay = 25000;
$emp->hra = 10000;
$emp->conveyance = 1600;
$emp->da = 0;
$emp->medical_allowance = 1250;
$emp->special_allowance = 0;
$emp->other_additions = 0;
$emp->bank_account_number = '12345';
$emp->account_holder_name = 'Test';
$emp->bank_ifsc = 'IFSC001';
$emp->bank_name = 'Bank';
$emp->bank_branch = 'Branch';
$emp->uan_mode = 'new';
$emp->pan_number = 'ABCDE1234F';
$emp->gratuity_mode = 'part_of_ctc';

$emp->save();

echo "Basic Pay: " . $emp->basic_pay . "\n";
echo "Gross: " . $emp->gross_monthly_salary . "\n";
echo "Net: " . $emp->net_take_home_monthly . "\n";
echo "Employer PF: " . $emp->employer_pf_monthly . "\n";
echo "Employee PF: " . json_decode($emp, true)['employee_pf_monthly'] ?? 'not-in-db-model-but-calculated-by-service' . "\n"; // Observer doesn't save employee_pf_monthly explicitly? Oh wait, employee_pf is not a db field.
echo "Employer ESI: " . $emp->employer_esi_monthly . "\n";
echo "CTC: " . $emp->ctc_monthly . "\n";
