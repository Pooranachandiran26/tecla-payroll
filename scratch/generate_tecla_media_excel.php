<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Spatie\SimpleExcel\SimpleExcelWriter;

$outputPath = storage_path('app/public/Tecla_Media_20_Employees_Bulk_Upload.xlsx');
if (!is_dir(dirname($outputPath))) {
    mkdir(dirname($outputPath), 0755, true);
}

if (file_exists($outputPath)) {
    unlink($outputPath);
}

$writer = SimpleExcelWriter::create($outputPath);
$writer->nameCurrentSheet('Employee Data');

// 42 Headers (Insurance omitted because Tecla Media has health_insurance_enabled = false)
$writer->addHeader([
    'employee_code', 'full_name', 'client_code', 'branch_name', 'personal_email', 'phone_number',
    'date_of_birth', 'date_of_joining', 'designation', 'employment_model', 'prior_employment_flag',
    'residential_address', 'bank_account_number', 'bank_ifsc', 'bank_name', 'bank_branch',
    'account_holder_name', 'pan_number', 'basic_pay', 'hra', 'conveyance', 'da',
    'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 'eps_applicable',
    'esi_applicable', 'pt_applicable', 'lwf_applicable', 'tds_applicable', 'uan_mode',
    'uan_number', 'esi_mode', 'esic_number', 'tds_regime', 'gratuity_mode', 'lop_basis_days',
    'declarations_accepted', 'reporting_manager_code', 'probation_end_date', 'attendance_tracking_start_date'
]);

$employees = [
    [
        'code' => 'TM-201', 'name' => 'Prem Kumar S', 'email' => 'prem.kumar201@teclamedia.com', 'phone' => '9840200001',
        'dob' => '1992-04-12', 'doj' => '2024-01-15', 'desig' => 'Creative Director', 'basic' => 50000, 'hra' => 20000, 'sa' => 15000,
        'addr' => '12 Gandhi Road, Viluppuram, Tamil Nadu', 'ifsc' => 'HDFC0001234', 'bank' => 'HDFC Bank', 'pan' => 'TMEDI2001A', 'dob_age' => 34
    ],
    [
        'code' => 'TM-202', 'name' => 'Ananya Sharma', 'email' => 'ananya.s202@teclamedia.com', 'phone' => '9840200002',
        'dob' => '1996-08-20', 'doj' => '2024-02-01', 'desig' => 'Senior Video Editor', 'basic' => 30000, 'hra' => 12000, 'sa' => 8000,
        'addr' => '45 Anna Nagar, Chennai, Tamil Nadu', 'ifsc' => 'ICIC0000567', 'bank' => 'ICICI Bank', 'pan' => 'TMEDI2002B', 'dob_age' => 30
    ],
    [
        'code' => 'TM-203', 'name' => 'Rajesh Kannan R', 'email' => 'rajesh.k203@teclamedia.com', 'phone' => '9840200003',
        'dob' => '1988-11-05', 'doj' => '2024-02-15', 'desig' => 'Accounts & Admin Manager', 'basic' => 40000, 'hra' => 16000, 'sa' => 10000,
        'addr' => '78 MTH Road, Viluppuram, Tamil Nadu', 'ifsc' => 'SBIN0004321', 'bank' => 'State Bank of India', 'pan' => 'TMEDI2003C', 'dob_age' => 38
    ],
    [
        'code' => 'TM-204', 'name' => 'Priya Lakshmi M', 'email' => 'priya.l204@teclamedia.com', 'phone' => '9840200004',
        'dob' => '1998-03-15', 'doj' => '2024-03-01', 'desig' => 'Content Strategist', 'basic' => 25000, 'hra' => 10000, 'sa' => 5000,
        'addr' => '23 KK Nagar, Trichy, Tamil Nadu', 'ifsc' => 'UTIB0000888', 'bank' => 'Axis Bank', 'pan' => 'TMEDI2004D', 'dob_age' => 28
    ],
    [
        'code' => 'TM-205', 'name' => 'Karthik Raja V', 'email' => 'karthik.r205@teclamedia.com', 'phone' => '9840200005',
        'dob' => '1995-10-10', 'doj' => '2024-03-15', 'desig' => 'Motion Graphics Artist', 'basic' => 28000, 'hra' => 11000, 'sa' => 6000,
        'addr' => '89 Cross Street, Coimbatore, Tamil Nadu', 'ifsc' => 'HDFC0001234', 'bank' => 'HDFC Bank', 'pan' => 'TMEDI2005E', 'dob_age' => 31
    ],
    [
        'code' => 'TM-206', 'name' => 'Divya Bharathi K', 'email' => 'divya.b206@teclamedia.com', 'phone' => '9840200006',
        'dob' => '2001-01-25', 'doj' => '2024-04-01', 'desig' => 'Junior Graphic Designer', 'basic' => 14000, 'hra' => 5000, 'sa' => 1000,
        'addr' => '12 Station Road, Viluppuram, Tamil Nadu', 'ifsc' => 'IOBA0001122', 'bank' => 'Indian Overseas Bank', 'pan' => 'TMEDI2006F', 'dob_age' => 25
    ],
    [
        'code' => 'TM-207', 'name' => 'Suresh Babu P', 'email' => 'suresh.b207@teclamedia.com', 'phone' => '9840200007',
        'dob' => '1964-06-18', 'doj' => '2024-04-15', 'desig' => 'Senior Production Consultant', 'basic' => 60000, 'hra' => 24000, 'sa' => 16000,
        'addr' => '56 High Road, Madurai, Tamil Nadu', 'ifsc' => 'SBIN0004321', 'bank' => 'State Bank of India', 'pan' => 'TMEDI2007G', 'dob_age' => 62 // Senior 58+
    ],
    [
        'code' => 'TM-208', 'name' => 'Meenakshi Sundaram', 'email' => 'meenakshi.s208@teclamedia.com', 'phone' => '9840200008',
        'dob' => '1994-12-04', 'doj' => '2024-05-01', 'desig' => 'Digital Marketing Lead', 'basic' => 35000, 'hra' => 14000, 'sa' => 9000,
        'addr' => '34 Main Road, Salem, Tamil Nadu', 'ifsc' => 'ICIC0000567', 'bank' => 'ICICI Bank', 'pan' => 'TMEDI2008H', 'dob_age' => 32
    ],
    [
        'code' => 'TM-209', 'name' => 'Arun Prakash G', 'email' => 'arun.p209@teclamedia.com', 'phone' => '9840200009',
        'dob' => '1997-07-07', 'doj' => '2024-05-15', 'desig' => 'SEO & SEM Specialist', 'basic' => 22000, 'hra' => 8800, 'sa' => 3200,
        'addr' => '67 West Avenue, Viluppuram, Tamil Nadu', 'ifsc' => 'UTIB0000888', 'bank' => 'Axis Bank', 'pan' => 'TMEDI2009I', 'dob_age' => 29
    ],
    [
        'code' => 'TM-210', 'name' => 'Kavitha Raman', 'email' => 'kavitha.r210@teclamedia.com', 'phone' => '9840200010',
        'dob' => '1999-02-14', 'doj' => '2024-06-01', 'desig' => 'Social Media Executive', 'basic' => 18000, 'hra' => 6000, 'sa' => 2000,
        'addr' => '90 South Street, Tirunelveli, Tamil Nadu', 'ifsc' => 'HDFC0001234', 'bank' => 'HDFC Bank', 'pan' => 'TMEDI2010J', 'dob_age' => 27
    ],
    [
        'code' => 'TM-211', 'name' => 'Vignesh Kumar A', 'email' => 'vignesh.k211@teclamedia.com', 'phone' => '9840200011',
        'dob' => '1993-09-09', 'doj' => '2024-06-15', 'desig' => 'Sound & Audio Engineer', 'basic' => 32000, 'hra' => 12800, 'sa' => 7200,
        'addr' => '11 Lakeview Road, Chennai, Tamil Nadu', 'ifsc' => 'IOBA0001122', 'bank' => 'Indian Overseas Bank', 'pan' => 'TMEDI2011K', 'dob_age' => 33
    ],
    [
        'code' => 'TM-212', 'name' => 'Deepa Vani S', 'email' => 'deepa.v212@teclamedia.com', 'phone' => '9840200012',
        'dob' => '2000-05-30', 'doj' => '2024-07-01', 'desig' => 'Copywriter & Editor', 'basic' => 15000, 'hra' => 5000, 'sa' => 0,
        'addr' => '22 North Street, Viluppuram, Tamil Nadu', 'ifsc' => 'SBIN0004321', 'bank' => 'State Bank of India', 'pan' => 'TMEDI2012L', 'dob_age' => 26
    ],
    [
        'code' => 'TM-213', 'name' => 'Arvind Swamy M', 'email' => 'arvind.s213@teclamedia.com', 'phone' => '9840200013',
        'dob' => '1991-11-22', 'doj' => '2024-08-01', 'desig' => 'Brand & PR Manager', 'basic' => 45000, 'hra' => 18000, 'sa' => 12000,
        'addr' => '44 OMR Road, Chennai, Tamil Nadu', 'ifsc' => 'ICIC0000567', 'bank' => 'ICICI Bank', 'pan' => 'TMEDI2013M', 'dob_age' => 35
    ],
    [
        'code' => 'TM-214', 'name' => 'Shalini Naidu', 'email' => 'shalini.n214@teclamedia.com', 'phone' => '9840200014',
        'dob' => '1996-04-18', 'doj' => '2024-09-01', 'desig' => 'UI & UX Designer', 'basic' => 30000, 'hra' => 12000, 'sa' => 8000,
        'addr' => '77 Velachery Main Rd, Chennai, Tamil Nadu', 'ifsc' => 'UTIB0000888', 'bank' => 'Axis Bank', 'pan' => 'TMEDI2014N', 'dob_age' => 30
    ],
    [
        'code' => 'TM-215', 'name' => 'Balaji Sundar T', 'email' => 'balaji.s215@teclamedia.com', 'phone' => '9840200015',
        'dob' => '1990-01-05', 'doj' => '2024-10-01', 'desig' => 'Production Manager', 'basic' => 42000, 'hra' => 16800, 'sa' => 11200,
        'addr' => '19 Bazaar Street, Viluppuram, Tamil Nadu', 'ifsc' => 'HDFC0001234', 'bank' => 'HDFC Bank', 'pan' => 'TMEDI2015O', 'dob_age' => 36
    ],
    [
        'code' => 'TM-216', 'name' => 'Nithya Shree C', 'email' => 'nithya.s216@teclamedia.com', 'phone' => '9840200016',
        'dob' => '2002-08-14', 'doj' => '2024-11-01', 'desig' => 'Media Intern & Assistant', 'basic' => 12000, 'hra' => 4000, 'sa' => 0,
        'addr' => '88 East Street, Cuddalore, Tamil Nadu', 'ifsc' => 'IOBA0001122', 'bank' => 'Indian Overseas Bank', 'pan' => 'TMEDI2016P', 'dob_age' => 24
    ],
    [
        'code' => 'TM-217', 'name' => 'Manoj Kumar V', 'email' => 'manoj.k217@teclamedia.com', 'phone' => '9840200017',
        'dob' => '1989-06-25', 'doj' => '2025-01-01', 'desig' => 'IT & Systems Administrator', 'basic' => 38000, 'hra' => 15200, 'sa' => 9800,
        'addr' => '15 GST Road, Chengalpattu, Tamil Nadu', 'ifsc' => 'SBIN0004321', 'bank' => 'State Bank of India', 'pan' => 'TMEDI2017Q', 'dob_age' => 37
    ],
    [
        'code' => 'TM-218', 'name' => 'Revathi Prasad', 'email' => 'revathi.p218@teclamedia.com', 'phone' => '9840200018',
        'dob' => '1995-03-31', 'doj' => '2025-02-01', 'desig' => 'HR Executive', 'basic' => 26000, 'hra' => 10400, 'sa' => 5600,
        'addr' => '63 Trichy Main Rd, Viluppuram, Tamil Nadu', 'ifsc' => 'ICIC0000567', 'bank' => 'ICICI Bank', 'pan' => 'TMEDI2018R', 'dob_age' => 31
    ],
    [
        'code' => 'TM-219', 'name' => 'Harish Rangan N', 'email' => 'harish.r219@teclamedia.com', 'phone' => '9840200019',
        'dob' => '1997-12-12', 'doj' => '2025-03-01', 'desig' => 'Videographer & Cinematographer', 'basic' => 27000, 'hra' => 10800, 'sa' => 5200,
        'addr' => '29 ECR Road, Pondicherry', 'ifsc' => 'UTIB0000888', 'bank' => 'Axis Bank', 'pan' => 'TMEDI2019S', 'dob_age' => 29
    ],
    [
        'code' => 'TM-220', 'name' => 'Archana Devi K', 'email' => 'archana.d220@teclamedia.com', 'phone' => '9840200020',
        'dob' => '1998-10-08', 'doj' => '2025-04-01', 'desig' => 'Client Relationship Lead', 'basic' => 29000, 'hra' => 11600, 'sa' => 6400,
        'addr' => '99 Pondy Main Rd, Viluppuram, Tamil Nadu', 'ifsc' => 'HDFC0001234', 'bank' => 'HDFC Bank', 'pan' => 'TMEDI2020T', 'dob_age' => 28
    ],
];

foreach ($employees as $idx => $emp) {
    $gross = $emp['basic'] + $emp['hra'] + $emp['sa'];
    $esiApplicable = ($gross <= 21000) ? '1' : '0';
    $tdsApplicable = ($gross > 25000) ? '1' : '0';
    $bankAcc = sprintf('992200200%03d', $idx + 1);
    
    // Probation end date = 6 months after DOJ
    $dojObj = new DateTime($emp['doj']);
    $probEnd = (clone $dojObj)->modify('+6 months')->format('Y-m-d');

    $writer->addRow([
        'employee_code' => $emp['code'],
        'full_name' => $emp['name'],
        'client_code' => 'TEC-278', // Tecla Media Client Code
        'branch_name' => 'Head Office', // Tecla Media Branch
        'personal_email' => $emp['email'],
        'phone_number' => $emp['phone'],
        'date_of_birth' => $emp['dob'],
        'date_of_joining' => $emp['doj'],
        'designation' => $emp['desig'],
        'employment_model' => 'agency_contract',
        'prior_employment_flag' => '0',
        'residential_address' => $emp['addr'],
        'bank_account_number' => $bankAcc,
        'bank_ifsc' => $emp['ifsc'],
        'bank_name' => $emp['bank'],
        'bank_branch' => 'Main Branch',
        'account_holder_name' => $emp['name'],
        'pan_number' => $emp['pan'],
        'basic_pay' => (string)$emp['basic'],
        'hra' => (string)$emp['hra'],
        'conveyance' => '0',
        'da' => '0',
        'medical_allowance' => '0',
        'special_allowance' => (string)$emp['sa'],
        'other_additions' => '0',
        'pf_applicable' => '1',
        'eps_applicable' => '1',
        'esi_applicable' => $esiApplicable,
        'pt_applicable' => '1',
        'lwf_applicable' => '0',
        'tds_applicable' => $tdsApplicable,
        'uan_mode' => 'new',
        'uan_number' => '',
        'esi_mode' => 'new',
        'esic_number' => '',
        'tds_regime' => 'new',
        'gratuity_mode' => 'part_of_ctc',
        'lop_basis_days' => '30',
        'declarations_accepted' => '1',
        'reporting_manager_code' => '',
        'probation_end_date' => $probEnd,
        'attendance_tracking_start_date' => $emp['doj'],
    ]);
}

$writer->close();
echo "SUCCESS: Generated Excel file at " . $outputPath . "\n";
