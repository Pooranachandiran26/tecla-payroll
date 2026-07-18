<?php

require __DIR__ . '/../vendor/autoload.php';

use Spatie\SimpleExcel\SimpleExcelWriter;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Color;

$path = __DIR__ . '/styled_test.xlsx';

$writer = SimpleExcelWriter::create($path);

// Set column widths so headers aren't squished!
$options = $writer->getWriter()->getOptions();
if (method_exists($options, 'setColumnWidthForRange')) {
    $options->setColumnWidthForRange(26.0, 1, 40);
}

// Set Dark Navy header style
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

$writer->addRow([
    'employee_code' => 'EMP101',
    'full_name' => 'Sample Employee',
    'client_code' => 'ACME01',
    'branch_name' => 'Main',
    'personal_email' => 'employee@example.com',
    'phone_number' => '9876543210',
    'date_of_birth' => '1995-05-15',
    'date_of_joining' => '2023-01-01',
    'designation' => 'Software Engineer',
    'employment_model' => 'eor',
    'prior_employment_flag' => '0',
    'residential_address' => '123 Tech Park, City',
    'bank_account_number' => '123456789012',
    'bank_ifsc' => 'SBIN0001234',
    'bank_name' => 'State Bank of India',
    'bank_branch' => 'Main Branch',
    'account_holder_name' => 'Sample Employee',
    'pan_number' => 'ABCDE1234F',
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

// Sheet 2: Client Defaults (Read Only)
$writer->addNewSheetAndMakeItCurrent('Client Defaults (Read Only)');
$writer->setHeaderStyle($headerStyle);
$writer->addHeader(['Setting Field', 'Value', 'Notes']);
$writer->addRow([
    'Setting Field' => 'Client Code',
    'Value' => 'ACME01',
    'Notes' => 'Must match client_code in Employee Data sheet'
]);
$writer->addRow([
    'Setting Field' => 'Company Name',
    'Value' => 'Acme Corporation',
    'Notes' => 'Client legal entity name'
]);
$writer->addRow([
    'Setting Field' => 'Default LOP Basis',
    'Value' => '26',
    'Notes' => 'Default monthly calculation basis (26 or 30 days)'
]);
$writer->addRow([
    'Setting Field' => 'PF Default',
    'Value' => '1 (YES)',
    'Notes' => 'Inherited if pf_applicable is omitted in row'
]);

$writer->close();
echo "Wrote styled Excel file: " . realpath($path) . "\n";
