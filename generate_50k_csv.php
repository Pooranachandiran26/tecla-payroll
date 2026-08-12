
<?php
$outputFile = __DIR__ . '/public/50000_employees_bulk.csv';
$fp = fopen($outputFile, 'w');

$header = [
    'employee_code', 'full_name', 'first_name', 'last_name', 'personal_email', 'work_email', 
    'phone_number', 'gender', 'date_of_birth', 'date_of_joining', 'client_code', 'branch_code', 
    'department', 'designation', 'employment_type', 'employment_model', 'residential_address', 
    'annual_ctc', 'basic_pay', 'hra', 'bank_name', 'bank_account_number', 'bank_ifsc', 'ifsc_code', 
    'account_holder_name', 'pan_number', 'aadhaar_number'
];
fputcsv($fp, $header);

$firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan'];
$lastNames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Iyer', 'Joshi'];
$genders = ['Male', 'Female'];
$clientCodes = ['TVG-001', 'APX-002', 'GPR-003', 'ZHL-004', 'QAI-005', 'BFA-006', 'TRE-007', 'OMN-008', 'SIB-009', 'FHA-010'];
$departments = ['Engineering', 'Human Resources', 'Sales & Marketing', 'Finance & Payroll', 'Operations', 'Quality Assurance', 'Customer Support', 'IT Infrastructure'];
$designations = ['Junior Executive', 'Senior Associate', 'Team Lead', 'Assistant Manager', 'Lead Analyst', 'Software Engineer', 'Senior Engineer', 'Specialist'];

for ($i = 1; $i <= 50000; $i++) {
    $idx = str_pad($i, 5, '0', STR_PAD_LEFT);
    $fn = $firstNames[$i % count($firstNames)];
    $ln = $lastNames[$i % count($lastNames)];
    $cc = $clientCodes[$i % count($clientCodes)];
    $dep = $departments[$i % count($departments)];
    $desig = $designations[$i % count($designations)];
    $gender = $genders[$i % count($genders)];
    
    $row = [
        "EMP-B50K-{$idx}",
        "$fn $ln",
        $fn,
        $ln,
        "bulk.emp.{$idx}@testdomain.com",
        strtolower($fn) . ".{$idx}@" . strtolower($cc) . ".com",
        (9000000000 + $i),
        $gender,
        '1995-05-15',
        '2024-01-10',
        $cc,
        1,
        $dep,
        $desig,
        'full_time',
        ($i % 2 == 0) ? 'eor' : 'agency_contract',
        "{$i} Tech Park Main Road, Sector " . (($i % 50) + 1) . ", Chennai, Tamil Nadu - 600040",
        385000 + ($i % 100) * 1000,
        16000 + ($i % 100) * 100,
        8000 + ($i % 100) * 50,
        "HDFC Bank",
        (911000000000 + $i),
        "HDFC0001234",
        "HDFC0001234",
        "$fn $ln",
        "ABCDE" . str_pad($i % 9999, 4, '0', STR_PAD_LEFT) . "F",
        (990000000000 + $i)
    ];
    fputcsv($fp, $row);
}
fclose($fp);
echo "Generated $outputFile\n";
