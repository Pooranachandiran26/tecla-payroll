<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\SimpleExcel\SimpleExcelWriter;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Color;

$dir = __DIR__ . '/../templates';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$path = $dir . '/synstar_500_employees.xlsx';

$writer = SimpleExcelWriter::create($path);

// Apply styles
$options = $writer->getWriter()->getOptions();
if (method_exists($options, 'setColumnWidthForRange')) {
    $options->setColumnWidthForRange(25.0, 1, 40);
}

$headerStyle = (new Style())
    ->setFontBold()
    ->setFontSize(11)
    ->setFontColor(Color::WHITE)
    ->setBackgroundColor('1F3864');
$writer->setHeaderStyle($headerStyle);

$writer->nameCurrentSheet('Employee Data');
$writer->addHeader([
    'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
    'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
    'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
    'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
    'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable',
    'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
    'uan_number', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
    'declarations_accepted', 'reporting_manager_code'
]);

// 400 valid rows
for ($i = 1; $i <= 400; $i++) {
    $code = 'SYN_V_' . sprintf('%04d', $i);
    $writer->addRow([
        'employee_code' => $code,
        'full_name' => 'Valid Employee ' . $i,
        'client_code' => 'SYN-STAFF-01',
        'branch_name' => 'Head Office',
        'personal_email' => 'valid_syn_' . $i . '@example.com',
        'phone_number' => '9' . sprintf('%09d', 100000000 + $i),
        'date_of_birth' => '1990-01-01',
        'date_of_joining' => '2023-01-01',
        'designation' => 'Software Engineer',
        'employment_model' => 'eor',
        'prior_employment_flag' => '0',
        'residential_address' => '123 Tech Park, City',
        'bank_account_number' => 'ACC' . sprintf('%08d', $i),
        'bank_ifsc' => 'SBIN0001234',
        'bank_name' => 'State Bank of India',
        'bank_branch' => 'Main Branch',
        'account_holder_name' => 'Valid Employee ' . $i,
        'pan_number' => 'ABCDE' . sprintf('%04d', $i) . 'F',
        'basic_pay' => '25000',
        'hra' => '10000',
        'conveyance' => '2000',
        'da' => '0',
        'medical_allowance' => '1250',
        'special_allowance' => '5000',
        'other_additions' => '0',
        'pf_applicable' => '1',
        'esi_applicable' => '0',
        'pt_applicable' => '1',
        'lwf_applicable' => '0',
        'tds_applicable' => '0',
        'uan_mode' => 'new',
        'uan_number' => '',
        'esic_number' => '',
        'tds_regime' => 'new',
        'gratuity_mode' => 'part_of_ctc',
        'lop_basis_days' => '26',
        'declarations_accepted' => '1',
        'reporting_manager_code' => ''
    ]);
}

// 100 invalid rows
for ($i = 1; $i <= 100; $i++) {
    $code = 'SYN_E_' . sprintf('%04d', $i);
    // Introduce errors: invalid email, missing PAN
    $writer->addRow([
        'employee_code' => $code,
        'full_name' => 'Error Employee ' . $i,
        'client_code' => 'SYN-STAFF-01',
        'branch_name' => 'Head Office',
        'personal_email' => 'invalid_syn_' . $i, // INVALID EMAIL
        'phone_number' => '9' . sprintf('%09d', 200000000 + $i),
        'date_of_birth' => '1990-01-01',
        'date_of_joining' => '2023-01-01',
        'designation' => 'Software Engineer',
        'employment_model' => 'eor',
        'prior_employment_flag' => '0',
        'residential_address' => '456 Error Ave, City',
        'bank_account_number' => 'ERR' . sprintf('%08d', $i),
        'bank_ifsc' => 'SBIN0001234',
        'bank_name' => 'State Bank of India',
        'bank_branch' => 'Main Branch',
        'account_holder_name' => 'Error Employee ' . $i,
        'pan_number' => '', // MISSING PAN
        'basic_pay' => '25000',
        'hra' => '10000',
        'conveyance' => '2000',
        'da' => '0',
        'medical_allowance' => '1250',
        'special_allowance' => '5000',
        'other_additions' => '0',
        'pf_applicable' => '1',
        'esi_applicable' => '0',
        'pt_applicable' => '1',
        'lwf_applicable' => '0',
        'tds_applicable' => '0',
        'uan_mode' => 'new',
        'uan_number' => '',
        'esic_number' => '',
        'tds_regime' => 'new',
        'gratuity_mode' => 'part_of_ctc',
        'lop_basis_days' => '26',
        'declarations_accepted' => '1',
        'reporting_manager_code' => ''
    ]);
}

$writer->close();
echo "Successfully generated 500 employee records (400 valid, 100 invalid) for Synstar client.\n";
echo "Saved to: " . realpath($path) . "\n";
