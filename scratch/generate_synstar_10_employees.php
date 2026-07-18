<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\SimpleExcel\SimpleExcelWriter;
use App\Models\Client;

$client = Client::with('branches')->where('company_name', 'like', '%Synstar%')->first();
if (!$client) {
    die("Synstar client not found.\n");
}

$branch = $client->branches->first();
$branchName = $branch ? $branch->branch_name : 'Main';

$filePath = __DIR__ . '/../templates/synstar_10_real_employees.xlsx';
if (!is_dir(dirname($filePath))) {
    mkdir(dirname($filePath), 0755, true);
}

$writer = SimpleExcelWriter::create($filePath);

// Apply styling to headers
$options = $writer->getWriter()->getOptions();
if (method_exists($options, 'setColumnWidthForRange')) {
    $options->setColumnWidthForRange(25.0, 1, 40);
}

$headerStyle = (new \OpenSpout\Common\Entity\Style\Style())
    ->setFontBold()
    ->setFontSize(11)
    ->setFontColor(\OpenSpout\Common\Entity\Style\Color::WHITE)
    ->setBackgroundColor('1F3864');
$writer->setHeaderStyle($headerStyle);

$writer->nameCurrentSheet('Employee Data');

$headers = [
    'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
    'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
    'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
    'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
    'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable',
    'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
    'uan_number', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
    'declarations_accepted', 'reporting_manager_code'
];

$writer->addHeader($headers);

$specificEmployees = [
    ['name' => 'Rajesh', 'email' => 'duke27353@gmail.com'],
    ['name' => 'Jesh', 'email' => 'heliosson344@gmail.com'],
    ['name' => 'Chandru', 'email' => 'mohankumar200167@gmail.com'],
    ['name' => 'Poorna', 'email' => 'chandru.2316728@gmail.com'],
    ['name' => 'Prem', 'email' => 'premsathiyaseelan5@gmail.com'],
    ['name' => 'Prem Kumar', 'email' => 'prem0572003@gmail.com'],
    ['name' => 'Nithish', 'email' => 'prem@tecla.in'],
    ['name' => 'User Eight', 'email' => 'test8@example.com'],
    ['name' => 'User Nine', 'email' => 'test9@example.com'],
    ['name' => 'User Ten', 'email' => 'test10@example.com'],
];

foreach ($specificEmployees as $index => $emp) {
    $num = $index + 1;
    $writer->addRow([
        'employee_code' => "REAL_EMP_{$num}",
        'full_name' => $emp['name'],
        'client_code' => $client->client_code,
        'branch_name' => $branchName,
        'personal_email' => $emp['email'],
        'phone_number' => '9' . str_pad($num, 9, '0', STR_PAD_LEFT),
        'date_of_birth' => '1990-01-01',
        'date_of_joining' => '2023-01-01',
        'designation' => 'Developer',
        'employment_model' => 'agency_contract',
        'prior_employment_flag' => '0',
        'residential_address' => "Address {$num}",
        'bank_account_number' => '123456789' . str_pad($num, 3, '0', STR_PAD_LEFT),
        'bank_ifsc' => 'SBIN0001234',
        'bank_name' => 'State Bank of India',
        'bank_branch' => 'Main',
        'account_holder_name' => $emp['name'],
        'pan_number' => 'ABCDE1' . str_pad($num, 3, '0', STR_PAD_LEFT) . 'A',
        'basic_pay' => '15000',
        'hra' => '5000',
        'conveyance' => '0',
        'da' => '0',
        'medical_allowance' => '0',
        'special_allowance' => '0',
        'other_additions' => '0',
        'pf_applicable' => '1',
        'esi_applicable' => '1',
        'pt_applicable' => '1',
        'lwf_applicable' => '0',
        'tds_applicable' => '0',
        'uan_mode' => 'new',
        'uan_number' => '',
        'esic_number' => '11' . str_pad($num, 8, '0', STR_PAD_LEFT), // Generating 10-digit ESIC number
        'tds_regime' => 'new',
        'gratuity_mode' => 'part_of_ctc',
        'lop_basis_days' => '26',
        'declarations_accepted' => '1',
        'reporting_manager_code' => ''
    ]);
}

$writer->close();

echo "Successfully generated templates/synstar_10_real_employees.xlsx\n";
