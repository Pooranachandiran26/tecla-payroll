const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function createSampleFiles() {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Employee Data
    const dataSheet = workbook.addWorksheet('Employee Data');
    
    const headers = [
        'employee_code', 'client_code', 'branch_code', 'full_name', 'personal_email', 'phone_number', 
        'emergency_contact_name', 'date_of_birth', 'date_of_joining', 'probation_end_date', 'designation', 
        'gender', 'employment_model', 'prior_employment_flag', 'previous_employer_name', 'previous_employer_uan', 
        'reporting_manager_code', 'residential_address', 'bank_account_number', 'bank_ifsc', 'account_holder_name', 
        'pan_number', 'aadhaar_number', 'esic_number', 'esi_contribution_period_end', 'declarations_accepted', 
        'tds_regime', 'gratuity_mode', 'lop_basis_days', 'basic_pay', 'hra', 
        'conveyance', 'da', 'medical_allowance', 'special_allowance', 'other_additions', 'pf_applicable', 
        'esi_applicable', 'pt_applicable'
    ];

    dataSheet.addRow(headers);
    const headerRow = dataSheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        dataSheet.getColumn(colNumber).width = 22;
    });

    const rows = [
        [
            'TEC-901', 'SYN-STAFF-01', '', 'Aravind Swamy', 'aravind.swamy.test901@example.com', '9840192834',
            'Sudha Swamy', '1994-08-12', '2024-01-15', '2024-07-15', 'Senior Software Engineer',
            'male', 'agency_contract', 1, 'Infosys Technologies', '100987654321',
            'EMP-101', '12/4 Anna Nagar, Chennai', '50100987654321', 'HDFC0001234', 'Aravind Swamy',
            'ARAVS9012K', '789012345678', '3344556677', '2024-09-30', 'yes',
            'new', 'part_of_ctc', 26, 25000, 10000,
            1600, 0, 1250, 7150, 0, 1,
            0, 1
        ],
        [
            'TEC-902', 'SYN-STAFF-01', '', 'Meera Nambiar', 'meera.nambiar.test902@example.com', '9789012345',
            'Karthik Nambiar', '1996-03-20', '2024-02-01', '2024-08-01', 'UI/UX Specialist',
            'female', 'eor', 0, '', '',
            'EMP-101', '55 M.G. Road, Bengaluru', '60200876543210', 'ICIC0005678', 'Meera Nambiar',
            'MEERN9023L', '890123456789', '4455667788', '2024-09-30', 1,
            'new', 'over_and_above', 26, 12000, 4800,
            1600, 0, 1250, 0, 0, 1,
            1, 1
        ]
    ];

    rows.forEach(r => {
        const row = dataSheet.addRow(r);
        row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9FF' } };
        });
    });

    dataSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const targetDir = path.join(__dirname, 'public', 'templates');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const xlsxPath = path.join(targetDir, 'two_employees_bulk_import.xlsx');
    const csvPath = path.join(targetDir, 'two_employees_bulk_import.csv');

    await workbook.xlsx.writeFile(xlsxPath);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(r => {
        const escapedRow = r.map(val => {
            if (typeof val === 'string' && val.includes(',')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        csvContent += escapedRow.join(',') + '\n';
    });
    fs.writeFileSync(csvPath, csvContent, 'utf8');

    console.log(`Excel file created at: ${xlsxPath}`);
    console.log(`CSV file created at: ${csvPath}`);
}

createSampleFiles().catch(console.error);
